"""Resume scoring - the orchestration, and nothing else.

The work is split so that the part that can fail and the part that must not are
never the same part:

    extract.py   loads a snapshot          (database)
    rules.py     turns it into a score     (pure arithmetic, always works)
    suggestions  rewrites the wording      (model, allowed to fail)
    store.py     caches the result         (database, allowed to fail)

Only the middle step decides anything. If the model is down the candidate still
gets their real score, their real missing keywords and sound static advice, with
`degraded: true` so the UI can say the suggestions are briefly unavailable. If
the cache write fails they still get the answer. Nothing between here and the
number can change the number.
"""

import logging
from datetime import datetime, timezone

from app.config import settings
from app.exceptions import DatabaseError
from app.resume_score.extract import load_score_input
from app.resume_score.rules import evaluate
from app.resume_score.store import load_analysis, save_analysis
from app.resume_score.suggestions import polish_improvements

logger = logging.getLogger(__name__)


def _iso(value) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value or "")


def _target_job(data) -> dict | None:
    job = data.job
    if not job:
        return None
    return {"id": str(job.get("id") or ""), "title": job.get("title") or ""}


def _resume_summary(data) -> dict | None:
    resume = data.resume
    if not resume:
        return None
    return {
        "name": resume.get("name") or "Your resume",
        "updated_at": _iso(resume.get("updated_at")),
    }


def score_resume(user_id: str, job_id: str | None = None, force: bool = False) -> dict:
    """Score a candidate's profile against a job and store the result.

    `force=False` serves a stored result while it is fresher than
    `resume_score_cache_ttl_seconds`, so re-opening the widget costs a row read
    instead of a slot in the two-wide interactive model pool. The "Re-check"
    button passes `force=True`, which is the whole point of the feature: edit
    the profile, re-check, watch the score move.
    """
    data = load_score_input(user_id, job_id)

    # Nothing to score. Showing someone 12/100 for not having filled the form
    # in yet is discouraging and tells them nothing they did not know.
    if not data.profile or not data.has_anything:
        return {"status": "no_profile"}

    if not force:
        try:
            cached = load_analysis(
                user_id, job_id, settings.resume_score_cache_ttl_seconds
            )
        except DatabaseError as e:
            logger.warning("Resume score cache read failed for %s: %s", user_id, e)
            cached = None
        if cached:
            return cached

    result = evaluate(data)
    ats_issues = result.pop("ats_issues", [])
    result.pop("bucket_points", None)

    improvements, degraded = polish_improvements(result["improvements"], data.job)

    response = {
        "status": "ok",
        "score": result["score"],
        "band": result["band"],
        "headline": result["headline"],
        "summary": result["summary"],
        "breakdown": result["breakdown"],
        "matched_keywords": result["matched_keywords"],
        "missing_keywords": result["missing_keywords"],
        "improvements": improvements,
        "target_job": _target_job(data),
        "resume": _resume_summary(data),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "degraded": degraded,
    }

    save_analysis(
        resume_id=(data.resume or {}).get("id"),
        user_id=user_id,
        job_id=job_id,
        result=response,
        ats_issues=ats_issues,
    )

    return response


def get_latest_score(user_id: str, job_id: str | None = None) -> dict | None:
    """Return the stored score for this candidate and job, if any.

    Never recomputes and never calls the model: the widget asks for this on
    mount, and a page load must not be able to queue GPU work.
    """
    return load_analysis(user_id, job_id)
