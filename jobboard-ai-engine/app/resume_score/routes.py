"""HTTP surface for applicant scoring.

Mounted twice by `app.main` — bare and under `/ai` — like every other endpoint
in this service.

The caller is an **employer**, identified by the `X-User-Id` header the API
gateway adds after it validates the JWT, never by a body field. Nothing in the
body names a candidate: the shortlist call takes a job id and the detail call
takes an application id, and in both cases the candidate is read out of a row
that the database has already confirmed the employer is entitled to. Taking a
user id here instead would let anyone score anyone by guessing a UUID.

Refusals come back as a 403 or a 404 whose body still carries a `status`, so
the UI can branch on one field whatever the transport said.
"""

import logging
import re

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.exceptions import DatabaseError, ExternalServiceError
from app.resume_score.scorer import score_applicant, score_applicants

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Applicant Scoring"])

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I
)

STATUS_CODES = {"not_authorised": 403, "not_found": 404}


class ApplicantScoresRequest(BaseModel):
    """Every applicant to one job, for the shortlist table."""

    job_id: str
    limit: int = Field(default=50, ge=1, le=200)


class ApplicantScoreRequest(BaseModel):
    """One applicant, for the candidate detail page."""

    application_id: str
    # Skip the cached row and re-run the checks, for the "Re-score" button.
    force: bool = False


def _require_employer(x_user_id: str | None) -> str:
    if not x_user_id or not UUID_RE.match(x_user_id):
        raise HTTPException(401, "Authentication required")
    return x_user_id


def _require_uuid(value: str | None, label: str) -> str:
    if not value or not UUID_RE.match(value):
        raise HTTPException(400, f"Invalid {label}")
    return value


def _respond(result: dict) -> dict | JSONResponse:
    """Turn a refusal into the right HTTP status without losing `status`."""
    code = STATUS_CODES.get(result.get("status"))
    if code:
        return JSONResponse(status_code=code, content=result)
    return result


@router.post("/applicant-scores")
def applicant_scores_endpoint(
    request: ApplicantScoresRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """Score every applicant to one of the employer's own jobs.

    Rules only — this may score dozens of people with somebody watching a
    spinner, and the model is the slow part.
    """
    employer_user_id = _require_employer(x_user_id)
    job_id = _require_uuid(request.job_id, "job ID")

    try:
        return _respond(
            score_applicants(employer_user_id, job_id, limit=request.limit)
        )
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")


@router.post("/applicant-score")
def applicant_score_endpoint(
    request: ApplicantScoreRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """The full breakdown for one application the employer is entitled to."""
    employer_user_id = _require_employer(x_user_id)
    application_id = _require_uuid(request.application_id, "application ID")

    try:
        return _respond(
            score_applicant(employer_user_id, application_id, force=request.force)
        )
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    except ExternalServiceError as e:
        # The scorer degrades rather than raising, so reaching here means
        # something outside the wording step failed.
        logger.warning("Applicant score failed: %s", e)
        raise HTTPException(503, str(e))
