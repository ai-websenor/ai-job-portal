"""HTTP surface for salary estimation.

Mounted twice by `app.main` — at `/salary-estimate` and at `/ai/salary-estimate`
— matching how every other endpoint in this service is reachable both directly
and through the gateway's `/ai` prefix.
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.exceptions import DatabaseError, ExternalServiceError
from app.salary.estimator import estimate_salary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Salary"])


class SalaryEstimateRequest(BaseModel):
    """What the employer has typed into the job form so far.

    Everything is optional except title, because the form is half-filled when
    the button is pressed. The estimator decides whether it has enough to work
    with and says so in `status`.
    """

    title: str = Field(..., min_length=1, max_length=255)
    skills: list[str] = Field(default_factory=list)
    experience_min: float | None = None
    experience_max: float | None = None
    location: str | None = None
    job_type: list[str] = Field(default_factory=list)
    work_mode: list[str] = Field(default_factory=list)
    pay_rate: str | None = None
    # What the employer currently has on the slider, used only for the
    # "your range is X% below the market" comparison.
    current_range: list[int] | None = None


@router.post("/salary-estimate")
def salary_estimate_endpoint(request: SalaryEstimateRequest):
    """Estimate the market salary range for a job being posted."""
    try:
        return estimate_salary(
            title=request.title,
            skills=request.skills,
            experience_min=request.experience_min,
            experience_max=request.experience_max,
            location=request.location,
            job_type=request.job_type,
            work_mode=request.work_mode,
            pay_rate=request.pay_rate,
            current_range=request.current_range,
        )
    except DatabaseError:
        raise HTTPException(503, "Service temporarily unavailable")
    except ExternalServiceError as e:
        # The model being down must never fail the request — the estimator
        # returns a degraded result instead. Reaching here means something
        # else broke.
        logger.warning("Salary estimate failed: %s", e)
        raise HTTPException(503, str(e))
