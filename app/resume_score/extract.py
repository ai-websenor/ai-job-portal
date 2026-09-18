"""Everything the checks need, loaded once and shaped for comparison.

Three sources feed a score, in descending order of authority:

1. **The profile** — the source of truth. The whole point of the feature is the
   loop "fix your profile, re-check, watch the score rise", and the only thing
   a candidate can actually fix from the widget is their profile.
2. **The resume text** — used for the formatting checks and as a second place
   to look for a skill the candidate has but forgot to list.
3. **The job** — supplies the required skills and the experience band. Absent
   for a generic score, which the UI offers before a job is chosen.

This module does the loading and the shaping. It makes no judgements; those all
live in `rules.py`.
"""

import logging
from dataclasses import dataclass, field

from app.db import fetch_default_resume, fetch_job_requirements, fetch_user_profile
from app.exceptions import DatabaseError

logger = logging.getLogger(__name__)


@dataclass
class ScoreInput:
    """The immutable snapshot a score is computed from.

    `evaluate()` takes one of these and nothing else, which is what makes the
    score reproducible: the same snapshot always yields the same number.
    """

    user_id: str
    profile: dict | None = None
    resume: dict | None = None
    job: dict | None = None
    raw_text: str = ""

    # Derived once here so every check compares like with like.
    owned_skills: list[str] = field(default_factory=list)
    required_skills: list[str] = field(default_factory=list)

    @property
    def experience(self) -> list[dict]:
        return list((self.profile or {}).get("experience") or [])

    @property
    def education(self) -> list[dict]:
        return list((self.profile or {}).get("education") or [])

    @property
    def has_anything(self) -> bool:
        """False when there is nothing to score.

        A candidate with no skills and no experience would score around 12/100,
        which is a humiliating and useless thing to show someone who has simply
        not filled the form in yet. The caller turns this into `no_profile`.
        """
        return bool(self.owned_skills or self.experience)


def _clean_list(values) -> list[str]:
    out: list[str] = []
    for value in values or []:
        text = str(value).strip()
        if text:
            out.append(text)
    return out


def profile_skill_names(profile: dict | None) -> list[str]:
    """Skill names from the profile's skills tab."""
    rows = (profile or {}).get("skills") or []
    return _clean_list(row.get("name") if isinstance(row, dict) else row for row in rows)


def experience_skill_names(profile: dict | None) -> list[str]:
    """Skills attached to individual roles.

    Candidates routinely tag a technology on a job without adding it to the
    skills tab. Ignoring `skills_used` would report those as missing and tell
    someone to add a skill they have already entered.
    """
    out: list[str] = []
    for role in (profile or {}).get("experience") or []:
        if isinstance(role, dict):
            out.extend(_clean_list(role.get("skills_used")))
    return out


def owned_skills(profile: dict | None) -> list[str]:
    """Every skill the profile claims, from either place."""
    return profile_skill_names(profile) + experience_skill_names(profile)


def required_skills(job: dict | None) -> list[str]:
    """The job's skill list.

    Only the employer's explicit `skills` array counts. Mining the description
    for skill-shaped words would make the denominator of the score depend on
    prose, so the same profile would score differently against two identical
    jobs written by different recruiters.
    """
    return _clean_list((job or {}).get("skills"))


def load_score_input(user_id: str, job_id: str | None = None) -> ScoreInput:
    """Load profile, resume and job for one scoring run.

    The profile is required. The resume and the job are both optional: 189
    resumes exist against 264 profiles, so plenty of candidates will be scored
    with no file at all, and a generic score has no job by definition.
    """
    profile = fetch_user_profile(user_id)

    resume = None
    raw_text = ""
    if profile:
        # A missing resume is normal, not an error — it becomes an improvement
        # card rather than a failure.
        try:
            resume = fetch_default_resume(user_id)
        except DatabaseError:
            logger.warning("Resume lookup failed for %s; scoring profile only", user_id)
        if resume:
            raw_text = str(resume.get("raw_text") or "")

    job = fetch_job_requirements(job_id) if job_id else None
    if job_id and not job:
        logger.info("Resume score requested against unknown job %s", job_id)

    return ScoreInput(
        user_id=user_id,
        profile=profile,
        resume=resume,
        job=job,
        raw_text=raw_text,
        owned_skills=owned_skills(profile),
        required_skills=required_skills(job),
    )
