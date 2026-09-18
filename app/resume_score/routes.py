"""HTTP surface for resume scoring.

Mounted twice by `app.main` — bare and under `/ai` — like every other endpoint
in this service.

The candidate is identified by the `X-User-Id` header that the API gateway adds
after it validates the JWT, never by a body field. An earlier endpoint in this
service takes `user_id` in the body; copying that here would let anyone score
anyone else's resume by guessing a UUID.
"""

import logging
import re

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.exceptions import DatabaseError, ExternalServiceError
from app.resume_score.scorer import get_latest_score, score_resume

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Resume Scoring"])

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I
)


class ResumeScoreRequest(BaseModel):
    job_id: str | None = None
    # Skip the cached row and re-run the checks. Used by the widget's
    # "Re-check" button after the candidate edits their profile.
    force: bool = False


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id or not UUID_RE.match(x_user_id):
        raise HTTPException(401, "Authentication required")
    return x_user_id


def _validate_job_id(job_id: str | None) -> str | None:
    if job_id is None or job_id == "":
        return None
    if not UUID_RE.match(job_id):
        raise HTTPException(400, "Invalid job ID")
    return job_id


@router.post("/resume-score")
def resume_score_endpoint(
    request: ResumeScoreRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """Score the signed-in candidate's profile against a job."""
    user_id = _require_user(x_user_id)
    job_id = _validate_job_id(request.job_id)

    try:
        return score_resume(user_id=user_id, job_id=job_id, force=request.force)
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    except ExternalServiceError as e:
        logger.warning("Resume score failed: %s", e)
        raise HTTPException(503, str(e))


@router.get("/resume-score/latest")
def resume_score_latest_endpoint(
    job_id: str | None = None,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """Return the stored score without re-running anything.

    The widget calls this on mount so re-opening it costs a row read rather
    than a slot in the two-wide interactive model pool.
    """
    user_id = _require_user(x_user_id)
    job_id = _validate_job_id(job_id)

    try:
        result = get_latest_score(user_id=user_id, job_id=job_id)
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")

    if result is None:
        return {"status": "not_scored"}
    return result
