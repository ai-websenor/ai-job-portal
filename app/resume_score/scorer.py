"""Resume scoring — placeholder.

Implemented in the resume-score track. `app.resume_score.routes` already
depends on these signatures, so they exist from the start of the branch and the
service boots.
"""


def score_resume(user_id: str, job_id: str | None = None, force: bool = False) -> dict:
    """Score a candidate's profile against a job and store the result."""
    return {"status": "no_profile"}


def get_latest_score(user_id: str, job_id: str | None = None) -> dict | None:
    """Return the stored score for this candidate and job, if any."""
    return None
