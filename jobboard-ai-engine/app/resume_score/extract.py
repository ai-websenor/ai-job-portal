"""Everything the checks need, loaded once and shaped for comparison.

Three sources feed a score, in descending order of authority:

1. **The candidate's profile** — the source of truth for what they can do.
2. **The resume text** — used for the document checks and as a second place to
   look for a skill the candidate has but did not list.
3. **The job** — supplies the required skills and the experience band.

The profile is **anonymised on the way in**. This score is now shown to an
employer deciding who to interview, so anything that could stand in for a
protected characteristic is removed before the checks ever see it: name,
gender, date of birth, photo, video, address and nationality. Contact details
survive only as "present" or "absent", because the one thing the checks ask of
them is whether a reviewer could get in touch at all.

Scrubbing here rather than trusting `rules.py` not to look is deliberate. It
makes the guarantee a property of the data, so a future check cannot
accidentally reintroduce a protected field by reading a key that is simply not
there any more.

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
    score reproducible: the same snapshot always yields the same number. The
    profile inside it has already been through `anonymise_profile`, so there
    is nothing in here that identifies the person.
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

        A candidate with no skills and no experience would score around
        12/100, and showing an employer a number like that for somebody who
        simply has not filled the form in yet is worse than showing nothing:
        it reads as a judgement of the person. The caller turns this into
        `no_profile`.
        """
        return bool(self.owned_skills or self.experience)


# -- fairness: what the checks are not allowed to see --------------------

# Removed outright. Every one of these is either a protected characteristic, a
# direct proxy for one (a photo or a video shows age and ethnicity; an address
# tracks both wealth and ethnicity), or a name, which is the single strongest
# predictor of the bias this kind of tool is known to reproduce.
PROTECTED_FIELDS = (
    "first_name", "middle_name", "last_name", "full_name", "name",
    "gender", "date_of_birth", "dob", "age", "marital_status",
    "nationality", "citizenship", "religion",
    "profile_photo", "photo", "avatar", "video_resume_url",
    "address_line1", "address_line2", "city", "state", "country", "pin_code",
    "linkedin_url", "github_url", "website_url",
    "email", "alternate_phone", "user_id", "id",
)

# Kept, but only as a yes/no. "Can a reviewer get in touch" is a fair thing to
# ask of a profile; which address or which dialling code is not.
PRESENCE_ONLY_FIELDS = ("user_email", "phone")
PRESENT = "present"


def anonymise_profile(profile: dict | None) -> dict | None:
    """A copy of the profile with nothing identifying left in it.

    `fetch_user_profile` returns `SELECT p.*`, which includes gender, date of
    birth and the candidate's name. None of it may reach a number an employer
    uses to decide who to interview, so it is dropped here, at the one door
    every score comes through.

    Work history and education survive intact: employer names, job titles,
    institutions and degrees are what the job is actually being matched on.
    """
    if profile is None:
        return None

    clean = {
        key: value for key, value in profile.items()
        if key not in PROTECTED_FIELDS
    }
    for key in PRESENCE_ONLY_FIELDS:
        clean[key] = PRESENT if str(profile.get(key) or "").strip() else ""
    return clean


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

    `user_id` is the **candidate's** id, and it never comes from the caller of
    the HTTP endpoint: the employer sends an application id, and the candidate
    is read out of that application row. By the time this function is called
    the entitlement question has already been answered.

    The profile is required. The resume and the job are both optional: 189
    resumes exist against 264 profiles, so plenty of applicants will be scored
    with no file at all.
    """
    profile = anonymise_profile(fetch_user_profile(user_id))

    resume = None
    raw_text = ""
    if profile:
        # A missing resume is normal, not an error — it becomes a gap rather
        # than a failure.
        try:
            resume = fetch_default_resume(user_id)
        except DatabaseError:
            logger.warning("Resume lookup failed for %s; scoring profile only", user_id)
        if resume:
            raw_text = str(resume.get("raw_text") or "")

    job = fetch_job_requirements(job_id) if job_id else None
    if job_id and not job:
        logger.info("Applicant score requested against unknown job %s", job_id)

    return ScoreInput(
        user_id=user_id,
        profile=profile,
        resume=resume,
        job=job,
        raw_text=raw_text,
        owned_skills=owned_skills(profile),
        required_skills=required_skills(job),
    )
