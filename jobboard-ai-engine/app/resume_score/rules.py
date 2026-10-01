"""Every deterministic check, and the score.

Three rules govern this module and nothing else in the feature matters as much:

* **No model runs here.** A 3B model cannot add up reliably and would give the
  same applicant a different number every time it was asked. Every point in a
  response is counted in this file.
* **Same input, same output.** `evaluate()` reads only the snapshot it is
  handed, so the same applicant scored twice gets the same number. A score
  that drifts on its own is a score nobody can defend.
* **Only job-relevant facts.** The snapshot arrives already stripped of names,
  gender, age, photos and addresses (see `extract.anonymise_profile`), and
  nothing here goes looking for them. Skills, experience, education and the
  quality of the document — that is the whole basis of the number.

The 100 points split three ways, mirroring the three bars in the UI:

| Bucket              | Points | What it measures                            |
|---------------------|--------|---------------------------------------------|
| Skills & Keywords   | 40     | share of the job's required skills present  |
| Experience & Impact | 30     | 5 checks worth 6 points each                |
| Resume Quality      | 30     | 6 checks worth 5 points each                |

Each check also emits a short, factual, third-person sentence: a **strength**
when it passes, a **gap** when it does not. Those are what the employer reads.
They are observations about fit, never advice — an employer cannot edit
somebody else's profile, so telling them to is noise.
"""

import logging
import re
from datetime import date, datetime, timedelta

from app.common.skills import expand_skill_variants, skill_overlap
from app.config import settings

logger = logging.getLogger(__name__)

SKILL_POINTS = 40
EXPERIENCE_POINTS = 30
CONTENT_POINTS = 30

# A profile that lists this many skills stops losing points when there is no
# job to measure against. Eight is roughly where a profile starts appearing in
# a useful spread of employer searches.
GENERIC_SKILL_TARGET = 8

# Word counts either side of this read as a stub or as a dissertation.
RESUME_MIN_WORDS = 150
RESUME_MAX_WORDS = 1200

SUMMARY_MIN_WORDS = 30
PROFILE_COMPLETE_PERCENT = 80

# "Recent" is generous on purpose: career breaks, study and caring gaps are
# common, they fall unevenly on people, and a shortlisting score is the last
# place that should be punished.
RECENT_ROLE_DAYS = 730

ACTION_VERBS = (
    "achieved", "architected", "automated", "built", "created", "cut",
    "delivered", "designed", "developed", "directed", "drove", "engineered",
    "expanded", "implemented", "improved", "increased", "introduced",
    "launched", "led", "managed", "migrated", "optimised", "optimized",
    "owned", "rebuilt", "reduced", "refactored", "resolved", "scaled",
    "shipped", "simplified", "streamlined", "supported", "trained",
)

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

# The headline describes the match, not the person. "Excellent candidate" is
# a judgement this tool is not entitled to make; "strong match for this role"
# is a statement about overlap, which is all it measured.
BANDS = (
    (85, "excellent", "Strong match for this role"),
    (70, "good", "Good match for this role"),
    (50, "fair", "Partial match for this role"),
    (0, "needs_work", "Limited match for this role"),
)

# Checks that describe the resume file rather than the profile. Stored in the
# `ats_issues` column, which is what that column was always for.
ATS_CHECK_IDS = {
    "upload-resume", "resume-too-short", "resume-too-long",
    "fix-inconsistent-dates", "add-contact-details",
}


# -- small helpers -------------------------------------------------------


def _finding(finding_id: str, priority: str, gap: str, points: int) -> dict:
    """One thing the applicant does not have. `points` is what it cost them."""
    return {
        "id": finding_id,
        "priority": priority,
        "gap": " ".join(str(gap).split()),
        "points": max(0, int(points)),
    }


def _as_date(value) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value.strip():
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m", "%Y"):
            try:
                return datetime.strptime(value.strip()[:10], fmt).date()
            except ValueError:
                continue
    return None


def _text_of(value) -> str:
    """Flatten a description or achievements field, which may be a list."""
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        return " ".join(_text_of(item) for item in value)
    if isinstance(value, dict):
        return " ".join(_text_of(item) for item in value.values())
    return str(value)


def _role_text(role: dict) -> str:
    return " ".join((
        _text_of(role.get("description")),
        _text_of(role.get("achievements")),
    )).strip()


def _found_in_text(skill: str, text: str) -> bool:
    """True when any spelling of `skill` appears in the resume text.

    Bounded on both sides so "R" does not match every word containing an r and
    "Go" does not match "Google". `+` and `#` count as word characters here so
    a bare "C" cannot match the "C" in "C++".
    """
    if not text:
        return False
    low = text.lower()
    for variant in expand_skill_variants([skill]):
        token = variant.strip().lower()
        if len(token) < 2:
            continue
        if re.search(rf"(?<![a-z0-9+#]){re.escape(token)}(?![a-z0-9+#])", low):
            return True
    return False


def _float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _years_text(years: float) -> str:
    """Round a career length to something a person would say out loud.

    total_experience_years arrives as a computed decimal (14.08), which reads
    like false precision about someone's career.
    """
    value = round(float(years) * 2) / 2  # nearest half year
    if value < 1:
        return "under a year"
    if value == int(value):
        return f"{int(value)} year{'s' if value != 1 else ''}"
    return f"{value:g} years"


def _listing(values: list[str], limit: int = 3) -> str:
    """"A, B and 2 more" — the stable way every sentence names skills."""
    shown = ", ".join(values[:limit])
    extra = len(values) - limit
    return f"{shown} and {extra} more" if extra > 0 else shown


# A total score alone will call someone a "Good match" on the strength of a
# long career and a tidy resume while they match two of the eight skills the
# job actually lists. Against the live data that is not hypothetical: an
# applicant scored 70 with experience 100, resume 100 and skills 25.
#
# For a tool an employer shortlists with, the skills bar is the part that
# answers "can they do this job", so it sets a ceiling on the claim the
# headline is allowed to make. The number still moves with every bucket;
# what it may be *called* does not outrun the skills evidence.
SKILLS_CEILING = (
    (60, None),          # 60%+ coverage: no ceiling
    (35, "fair"),        # 35-59%: at best a partial match
    (0, "needs_work"),   # under 35%: limited, whatever else is strong
)

_BAND_RANK = {key: i for i, (_, key, _) in enumerate(BANDS)}


def _ceiling_band(skills_pct: int | None) -> str | None:
    if skills_pct is None:
        return None
    for threshold, ceiling in SKILLS_CEILING:
        if skills_pct >= threshold:
            return ceiling
    return None


def band_for(score: int, skills_pct: int | None = None) -> tuple[str, str]:
    """Band and headline for a score, never outrunning the skills coverage.

    `skills_pct` is the Skills & Keywords bar. Omit it and this behaves as a
    plain threshold lookup, which is what the generic (no target job) path
    wants, since there are no required skills to cover.
    """
    for threshold, key, headline in BANDS:
        if score >= threshold:
            chosen = (key, headline)
            break
    else:
        chosen = (BANDS[-1][1], BANDS[-1][2])

    ceiling = _ceiling_band(skills_pct)
    if ceiling and _BAND_RANK[chosen[0]] < _BAND_RANK[ceiling]:
        return next((k, h) for _, k, h in BANDS if k == ceiling)
    return chosen


# -- bucket 1: skills and keywords (40) ----------------------------------


def _score_skills(data) -> tuple[int, list[str], list[str], list[str], list[dict]]:
    """Share of the job's required skills the applicant can evidence."""
    findings: list[dict] = []
    strengths: list[str] = []
    owned = list(data.owned_skills)
    required = list(data.required_skills)

    if not required:
        # No job to match against, so the question becomes "is there enough
        # here to match anything at all".
        distinct = len({s.lower() for s in owned})
        earned = round(
            SKILL_POINTS * min(distinct, GENERIC_SKILL_TARGET) / GENERIC_SKILL_TARGET
        )
        if distinct == 0:
            findings.append(_finding(
                "no-skills", "high",
                "No skills listed on the profile.",
                SKILL_POINTS,
            ))
        elif distinct < GENERIC_SKILL_TARGET:
            plural = "s" if distinct != 1 else ""
            findings.append(_finding(
                "few-skills", "medium",
                f"Only {distinct} skill{plural} listed on the profile.",
                SKILL_POINTS - earned,
            ))
        else:
            strengths.append(f"Lists {distinct} distinct skills.")
        return earned, [], [], strengths, findings

    matched, missing = skill_overlap(required, owned)

    # Second chance from the resume file: a skill written up in the resume but
    # never added to the skills tab is still evidence the applicant has it. It
    # earns the point and is still worth mentioning, because the employer's
    # own candidate search reads the profile, not the PDF.
    from_text: list[str] = []
    still_missing: list[str] = []
    for skill in missing:
        bucket = from_text if _found_in_text(skill, data.raw_text) else still_missing
        bucket.append(skill)

    matched = matched + from_text
    total = len(matched) + len(still_missing)
    ratio = (len(matched) / total) if total else 0.0
    earned = round(SKILL_POINTS * ratio)

    if matched:
        strengths.append(
            f"Covers {len(matched)} of the {total} skills this job lists: "
            f"{_listing(matched, 5)}."
        )

    if not owned:
        findings.append(_finding(
            "no-skills", "high",
            "No skills listed on the profile, so nothing this job asks for "
            "can be matched against it.",
            SKILL_POINTS - earned,
        ))
    elif still_missing:
        findings.append(_finding(
            "missing-skills", "high" if ratio < 0.6 else "medium",
            f"No mention of {_listing(still_missing)}, which this job lists.",
            SKILL_POINTS - earned,
        ))

    if from_text:
        findings.append(_finding(
            "skills-only-in-resume", "low",
            f"{_listing(from_text)} appears in the resume text but not on the "
            "profile skills list.",
            0,
        ))

    return earned, matched, still_missing, strengths, findings


# -- bucket 2: experience and impact (30) --------------------------------


def _score_experience(data, today: date) -> tuple[int, list[str], list[dict]]:
    """Five checks worth six points each."""
    roles = data.experience
    findings: list[dict] = []
    strengths: list[str] = []
    each = EXPERIENCE_POINTS // 5

    if not roles:
        findings.append(_finding(
            "no-experience", "high",
            "No work history listed on the profile.",
            EXPERIENCE_POINTS,
        ))
        return 0, strengths, findings

    earned = 0
    job = data.job or {}
    years = _float((data.profile or {}).get("total_experience_years"))

    # 1. Inside the band the job asks for. Being over the top of the band is
    #    not rewarded and not penalised — it is simply not what was asked.
    minimum = job.get("experience_min")
    maximum = job.get("experience_max")
    if minimum is None:
        if years > 0:
            earned += each
            strengths.append(f"{years:g} years of experience on the profile.")
        else:
            findings.append(_finding(
                "add-experience-years", "medium",
                "The profile does not state total years of experience.",
                each,
            ))
    elif years >= _float(minimum):
        earned += each
        band = (
            f"{_float(minimum):g}-{_float(maximum):g}" if maximum is not None
            else f"{_float(minimum):g}+"
        )
        strengths.append(
            f"{_years_text(years)} of experience against the {band} asked for."
        )
    else:
        findings.append(_finding(
            "experience-below-band", "medium",
            f"{years:g} years of experience, against the {_float(minimum):g}+ "
            "this job asks for.",
            each,
        ))

    # 2. A current or recent role.
    cutoff = today - timedelta(days=RECENT_ROLE_DAYS)
    recent = any(
        role.get("is_current") or ((_as_date(role.get("end_date")) or date.min) >= cutoff)
        for role in roles
    )
    if recent:
        earned += each
        strengths.append("Currently in, or recently left, a listed role.")
    else:
        findings.append(_finding(
            "no-current-role", "medium",
            "The most recent listed role ended more than two years ago.",
            each,
        ))

    # 3. Every role dated.
    undated = [
        role for role in roles
        if not _as_date(role.get("start_date"))
        or not (role.get("is_current") or _as_date(role.get("end_date")))
    ]
    if not undated:
        earned += each
        strengths.append(
            "The listed role carries start and end dates." if len(roles) == 1
            else f"All {len(roles)} listed roles carry start and end dates."
        )
    else:
        verb = "is" if len(undated) == 1 else "are"
        findings.append(_finding(
            "missing-role-dates", "medium",
            f"{len(undated)} of {len(roles)} roles {verb} missing a start or "
            "end date.",
            each,
        ))

    body = " ".join(_role_text(role) for role in roles)

    # 4. Numbers in the descriptions — measurable results.
    if re.search(r"\d", body):
        earned += each
        strengths.append("Role descriptions quantify the work with figures.")
    else:
        findings.append(_finding(
            "quantify-achievements", "medium",
            "No figures in any role description, so the scale of the work is "
            "not evidenced.",
            each,
        ))

    # 5. Action verbs.
    low = body.lower()
    verbs = {verb for verb in ACTION_VERBS if re.search(rf"\b{verb}\b", low)}
    if len(verbs) >= 3:
        earned += each
        strengths.append("Role descriptions are written in terms of what was delivered.")
    else:
        findings.append(_finding(
            "add-action-verbs", "low",
            "Role descriptions read as a list of duties rather than results.",
            each,
        ))

    return earned, strengths, findings


# -- bucket 3: resume quality (30) ---------------------------------------

# Each family is a way of writing the same thing. Two or more in one document
# is the inconsistency reviewers and resume parsers trip over.
_DATE_FAMILIES = (
    ("slash", re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b")),
    ("iso", re.compile(r"\b\d{4}-\d{1,2}-\d{1,2}\b")),
    ("dotted", re.compile(r"\b\d{1,2}\.\d{1,2}\.\d{2,4}\b")),
    ("month_name", re.compile(
        r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b",
        re.I)),
    ("month_slash", re.compile(r"\b\d{1,2}/\d{4}\b")),
)


def _mixed_date_formats(text: str) -> bool:
    if not text:
        return False
    families = [name for name, pattern in _DATE_FAMILIES if pattern.search(text)]
    return len(families) >= 2


def _score_content(data) -> tuple[int, list[str], list[dict]]:
    """Six checks worth five points each."""
    profile = data.profile or {}
    findings: list[dict] = []
    strengths: list[str] = []
    each = CONTENT_POINTS // 6
    earned = 0

    # 1. Contact details. Only their presence is visible here — the values
    #    were replaced with a marker before this module saw them.
    has_email = bool(str(profile.get("user_email") or "").strip())
    has_phone = bool(str(profile.get("phone") or "").strip())
    if has_email and has_phone:
        earned += each
    else:
        findings.append(_finding(
            "add-contact-details", "high",
            "The profile is missing an email address or a phone number.",
            each,
        ))

    # 2. Professional summary.
    summary_words = len(str(profile.get("professional_summary") or "").split())
    if summary_words >= SUMMARY_MIN_WORDS:
        earned += each
        strengths.append(f"Professional summary of {summary_words} words.")
    elif summary_words == 0:
        findings.append(_finding(
            "add-summary", "high",
            "No professional summary on the profile.",
            each,
        ))
    else:
        findings.append(_finding(
            "expand-summary", "medium",
            f"The professional summary is only {summary_words} words.",
            each,
        ))

    # 3. Education.
    if data.education:
        earned += each
        count = len(data.education)
        noun = "qualification" if count == 1 else "qualifications"
        strengths.append(f"{count} {noun} listed.")
    else:
        findings.append(_finding(
            "add-education", "medium",
            "No education listed on the profile.",
            each,
        ))

    # 4. Consistent dates in the resume file.
    if not _mixed_date_formats(data.raw_text):
        earned += each
    else:
        findings.append(_finding(
            "fix-inconsistent-dates", "low",
            "The resume mixes date formats, which is where parsers misread "
            "dates.",
            each,
        ))

    # 5. Resume present and a sensible length.
    words = len(data.raw_text.split())
    if not data.resume:
        findings.append(_finding(
            "upload-resume", "high",
            "No resume on file — the profile is the only thing to go on.",
            each,
        ))
    elif not data.raw_text:
        # The file exists but has never been parsed — 189 resumes, 66 parsed.
        # There is nothing to judge, so the benefit of the doubt goes to the
        # applicant rather than charging them for our own backlog.
        earned += each
    elif words < RESUME_MIN_WORDS:
        findings.append(_finding(
            "resume-too-short", "medium",
            f"The resume is about {words} words, short for a full history.",
            each,
        ))
    elif words > RESUME_MAX_WORDS:
        findings.append(_finding(
            "resume-too-long", "low",
            f"The resume is about {words} words, long for a first review.",
            each,
        ))
    else:
        earned += each
        strengths.append(f"Resume on file, about {words} words.")

    # 6. Overall completeness, as the platform itself measures it.
    completion = _float(profile.get("completion_percentage"))
    if completion >= PROFILE_COMPLETE_PERCENT:
        earned += each
        strengths.append(f"Profile is {completion:g}% complete.")
    else:
        findings.append(_finding(
            "complete-profile", "medium",
            f"The profile is only {completion:g}% complete.",
            each,
        ))

    return earned, strengths, findings


# -- assembly ------------------------------------------------------------


def _percent(points: int, total: int) -> int:
    """Bucket score as 0-100 — the UI draws these as progress bars."""
    if total <= 0:
        return 0
    return max(0, min(100, round(100 * points / total)))


def _order(findings: list[dict]) -> list[dict]:
    """Highest priority first, then biggest loss, then id so ties never wobble."""
    return sorted(
        findings,
        key=lambda f: (PRIORITY_ORDER.get(f["priority"], 3), -f["points"], f["id"]),
    )


# Keyed on the awarded band rather than the raw score, so the sentence can
# never contradict the headline above it. Reading "Covers most of what this
# role asks for" beside a skills bar of 25% is worse than saying nothing.
_SUMMARY_LEAD = {
    "excellent": "Covers nearly everything {target} asks for.",
    "good": "Covers most of what {target} asks for.",
    "fair": "Covers some of what {target} asks for.",
    "needs_work": "Misses several of the things {target} asks for.",
}


def _summary(band: str, gap_count: int, has_job: bool) -> str:
    """One or two plain sentences an employer can act on."""
    target = "this role" if has_job else "a typical role"
    lead = _SUMMARY_LEAD.get(band, _SUMMARY_LEAD["needs_work"]).format(target=target)

    if not gap_count:
        return f"{lead} Nothing significant is missing from the application."
    if gap_count == 1:
        return f"{lead} One gap worth asking about is listed below."
    return f"{lead} {gap_count} gaps worth asking about are listed below."


def evaluate(data, today: date | None = None) -> dict:
    """Score a snapshot. Pure: no model, no I/O, no clock beyond `today`.

    `today` is injectable so the "recent role" check can be tested without
    rewriting the fixtures every two years.
    """
    today = today or date.today()

    skill_points, matched, missing, skill_strengths, skill_findings = _score_skills(data)
    experience_points, exp_strengths, exp_findings = _score_experience(data, today)
    content_points, content_strengths, content_findings = _score_content(data)

    score = max(0, min(100, skill_points + experience_points + content_points))
    # The skills bar caps what the headline may claim. Only when there is a
    # target job: a generic score has no required skills to cover.
    skills_pct = _percent(skill_points, SKILL_POINTS) if data.job else None
    band, headline = band_for(score, skills_pct)

    findings = _order(skill_findings + exp_findings + content_findings)
    limit = max(1, int(settings.resume_score_max_suggestions or 6))
    shown = findings[:limit]

    ats_issues = [f["id"] for f in findings if f["id"] in ATS_CHECK_IDS]

    strengths = (skill_strengths + exp_strengths + content_strengths)[:limit]
    gaps = [f["gap"] for f in shown]

    return {
        "score": score,
        "band": band,
        "headline": headline,
        "summary": _summary(band, len(gaps), bool(data.job)),
        "breakdown": [
            {"key": "skills", "label": "Skills & Keywords",
             "score": _percent(skill_points, SKILL_POINTS)},
            {"key": "experience", "label": "Experience & Impact",
             "score": _percent(experience_points, EXPERIENCE_POINTS)},
            {"key": "content", "label": "Resume Quality",
             "score": _percent(content_points, CONTENT_POINTS)},
        ],
        "matched_keywords": matched,
        "missing_keywords": missing,
        "strengths": strengths,
        "gaps": gaps,
        "ats_issues": ats_issues,
        "bucket_points": {
            "skills": skill_points,
            "experience": experience_points,
            "content": content_points,
        },
    }
