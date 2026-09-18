"""Salary estimation — placeholder.

Implemented in the salary track. `app.salary.routes` already depends on this
signature, so it exists from the start of the branch and the service boots.
"""


def estimate_salary(
    title: str,
    skills: list[str] | None = None,
    experience_min: float | None = None,
    experience_max: float | None = None,
    location: str | None = None,
    job_type: list[str] | None = None,
    work_mode: list[str] | None = None,
    pay_rate: str | None = None,
    current_range: list[int] | None = None,
) -> dict:
    """Return a market salary estimate for a job posting."""
    return {"status": "insufficient_data", "reason": "not_implemented"}
