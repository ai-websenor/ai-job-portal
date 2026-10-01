"""Applicant scoring — the orchestration, and nothing else.

The work is split so that the part that can fail and the part that must not are
never the same part:

    db.py        answers "is this employer allowed to see this"  (database)
    extract.py   loads an anonymised snapshot                    (database)
    rules.py     turns it into a score        (pure arithmetic, always works)
    suggestions  rewrites the wording                (model, allowed to fail)
    store.py     caches the result                (database, allowed to fail)

Only the middle step decides anything. If the model is down the employer still
gets the real score, the real matched and missing keywords and sound static
wording, with `degraded: true`. If the cache write fails they still get the
answer. Nothing between here and the number can change the number.

Two entry points, because a shortlist and a candidate page want very different
things:

* `score_applicants` — every applicant to one job, number and band only. It
  may be scoring fifty people with somebody waiting on the response, so it
  never calls the model and never writes the cache.
* `score_applicant` — one applicant, the full breakdown, with the model
  allowed one pass over the wording.

Neither ever accepts a candidate id from the caller. The bulk call takes a job
and reads its applicants; the single call takes an application id and reads the
candidate out of it. An employer therefore cannot score somebody who did not
apply to a job they are entitled to see, however the request is shaped.
"""

import logging
from datetime import datetime, timezone

from app.config import settings
from app.db import (
    application_exists,
    employer_can_view_job,
    fetch_employer_application,
    fetch_job_applicants_for_employer,
)
from app.exceptions import DatabaseError
from app.resume_score.extract import load_score_input
from app.resume_score.rules import evaluate
from app.resume_score.store import load_analysis, save_analysis
from app.resume_score.suggestions import polish_observations

logger = logging.getLogger(__name__)

# One shortlist page. Scoring is a handful of queries per applicant, so an
# unbounded limit would let one request walk the whole applicant table.
MAX_BULK_APPLICANTS = 200

NOT_AUTHORISED = {"status": "not_authorised"}
NOT_FOUND = {"status": "not_found"}


def _target_job(data) -> dict | None:
    job = data.job
    if not job:
        return None
    return {"id": str(job.get("id") or ""), "title": job.get("title") or ""}


def _candidate(application: dict) -> dict:
    """What the employer is shown about who this is.

    The name is display metadata and nothing else — it is read here, next to
    the response, long after the score was computed from a profile that had
    the name stripped out of it. It can never reach `evaluate`.
    """
    return {
        "name": application.get("candidate_name") or "Applicant",
        "application_id": str(application.get("application_id") or ""),
    }


# -- the shortlist -------------------------------------------------------


def score_applicants(employer_user_id: str, job_id: str, limit: int = 50) -> dict:
    """Score every applicant to one job, keyed by application id.

    Keyed by application id rather than candidate id because that is what the
    applicant list rows already carry, and because it keeps candidate ids off
    the wire entirely.

    No model call and no cache. A number is wanted for every row at once, the
    arithmetic is deterministic, and serving half the list from a stored blob
    written at a different moment would make two rows incomparable.
    """
    limit = max(1, min(int(limit or 50), MAX_BULK_APPLICANTS))

    if not employer_can_view_job(employer_user_id, job_id):
        logger.info(
            "Refused applicant scores: %s does not own job %s",
            employer_user_id, job_id,
        )
        return dict(NOT_AUTHORISED)

    applicants = fetch_job_applicants_for_employer(employer_user_id, job_id, limit)

    scores: dict[str, dict] = {}
    for applicant in applicants:
        application_id = str(applicant["application_id"])
        candidate_user_id = str(applicant["candidate_user_id"])

        try:
            data = load_score_input(candidate_user_id, job_id)
        except DatabaseError as e:
            # One unreadable profile must not cost the employer the whole
            # shortlist; it reads as "nothing to score", which it is.
            logger.warning("Could not load applicant %s: %s", application_id, e)
            scores[application_id] = {"score": None, "band": None,
                                      "reason": "no_profile"}
            continue

        if not data.profile or not data.has_anything:
            # A null, not a zero. Zero is a judgement; this is an absence of
            # anything to judge, and an employer who cannot tell the two apart
            # will skip somebody for our missing data rather than their gaps.
            scores[application_id] = {"score": None, "band": None,
                                      "reason": "no_profile"}
            continue

        result = evaluate(data)
        scores[application_id] = {
            "score": result["score"],
            "band": result["band"],
            "degraded": False,
        }

    return {"status": "ok", "job_id": job_id, "scores": scores}


# -- one applicant -------------------------------------------------------


def score_applicant(employer_user_id: str, application_id: str,
                    force: bool = False) -> dict:
    """The full breakdown for one application.

    `force=False` serves a stored result while it is fresher than
    `resume_score_cache_ttl_seconds`, so re-opening a candidate costs a row
    read instead of a slot in the two-wide interactive model pool. The cache
    is keyed on the candidate, so a colleague opening the same application
    gets the same answer without recomputing it.
    """
    application = fetch_employer_application(employer_user_id, application_id)
    if not application:
        # "Not authorised" and "no such application" are told apart only after
        # the entitlement query has already refused, and the existence check
        # releases nothing but a yes or no.
        if application_exists(application_id):
            logger.info(
                "Refused applicant score: %s is not entitled to application %s",
                employer_user_id, application_id,
            )
            return dict(NOT_AUTHORISED)
        return dict(NOT_FOUND)

    candidate_user_id = str(application["candidate_user_id"])
    job_id = str(application["job_id"])
    candidate = _candidate(application)

    data = load_score_input(candidate_user_id, job_id)

    if not data.profile or not data.has_anything:
        return {
            "status": "no_profile",
            "candidate": candidate,
            "target_job": {
                "id": job_id,
                "title": application.get("job_title") or "",
            },
        }

    if not force:
        try:
            cached = load_analysis(
                candidate_user_id, job_id, settings.resume_score_cache_ttl_seconds
            )
        except DatabaseError as e:
            logger.warning("Score cache read failed for %s: %s", candidate_user_id, e)
            cached = None
        if cached:
            # The name is not cached — it is display metadata, and the row
            # belongs to the candidate rather than to one employer's view.
            cached["candidate"] = candidate
            return cached

    result = evaluate(data)
    ats_issues = result.pop("ats_issues", [])
    result.pop("bucket_points", None)

    strengths, gaps, degraded = polish_observations(
        result["strengths"], result["gaps"], data.job
    )

    response = {
        "status": "ok",
        "score": result["score"],
        "band": result["band"],
        "headline": result["headline"],
        "summary": result["summary"],
        "breakdown": result["breakdown"],
        "matched_keywords": result["matched_keywords"],
        "missing_keywords": result["missing_keywords"],
        "strengths": strengths,
        "gaps": gaps,
        "candidate": candidate,
        "target_job": _target_job(data) or {
            "id": job_id, "title": application.get("job_title") or ""
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "degraded": degraded,
    }

    save_analysis(
        resume_id=(data.resume or {}).get("id"),
        user_id=candidate_user_id,
        job_id=job_id,
        result=response,
        ats_issues=ats_issues,
    )

    return response
