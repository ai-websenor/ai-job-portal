"""Every deterministic check, and the score.

Two rules govern this module and nothing else in the feature matters as much:

* **No model runs here.** A 3B model cannot add up reliably and would give the
  same profile a different number every time it was asked. Every point in a
  response is counted in this file.
* **Same input, same output.** `evaluate()` reads only the snapshot it is
  handed, so a candidate who changes nothing and presses "Re-check" sees the
  same score. A score that drifts on its own teaches people to ignore it.

The 100 points split three ways, mirroring the three bars in the widget:

| Bucket              | Points | What it measures                            |
|---------------------|--------|---------------------------------------------|
| Skills & Keywords   | 40     | share of the job's required skills present  |
| Experience & Impact | 30     | 5 checks worth 6 points each                |
| Content Quality     | 30     | 6 checks worth 5 points each                |

Each failed check emits an improvement card carrying a stable `id` (the UI and
the stored history key off it), a priority, and a deep link to the profile tab
that fixes it.
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

# Profile deep links are `/profile?tab=N`.
TAB_PERSONAL = 1
TAB_EDUCATION = 2
TAB_SKILLS = 3
TAB_EXPERIENCE = 4
TAB_RESUME = 5

# A profile that lists this many skills stops losing points on a generic score.
# Eight is roughly where a profile starts appearing in a useful spread of
# employer searches; beyond it, more skills add noise rather than reach.
GENERIC_SKILL_TARGET = 8

# Word counts either side of this read as a stub or as a dissertation. Both
# cost a candidate interviews, so both cost points.
RESUME_MIN_WORDS = 150
RESUME_MAX_WORDS = 1200

SUMMARY_MIN_WORDS = 30
PROFILE_COMPLETE_PERCENT = 80

# "Recent" is generous on purpose: career breaks, study and caring gaps are
# common and a score is not the place to punish them.
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

BANDS = (
    (85, "excellent", "Excellent - your profile is in great shape"),
    (70, "good", "Good - a few improvements needed"),
    (50, "fair", "Fair - several gaps worth closing"),
    (0, "needs_work", "Needs work - start with the basics"),
)

# Checks that describe the resume file rather than the profile. Stored in the
# `ats_issues` column, which is what that column was always for.
ATS_CHECK_IDS = {
    "upload-resume", "resume-too-short", "resume-too-long",
    "fix-inconsistent-dates", "add-contact-details",
}


# -- small helpers -------------------------------------------------------


def _card(card_id: str, priority: str, title: str, description: str,
          label: str, tab: int, points: int) -> dict:
    """One improvement card. `points` is what fixing it gives back."""
    return {
        "id": card_id,
        "priority": priority,
        "title": title,
        "description": description,
        "action": {"label": label, "tab": tab},
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


def band_for(score: int) -> tuple[str, str]:
    for threshold, key, headline in BANDS:
        if score >= threshold:
            return key, headline
    return BANDS[-1][1], BANDS[-1][2]


# -- bucket 1: skills and keywords (40) ----------------------------------


def _score_skills(data) -> tuple[int, list[str], list[str], list[dict]]:
    """Share of the job's required skills the candidate can evidence."""
    cards: list[dict] = []
    owned = list(data.owned_skills)
    required = list(data.required_skills)

    if not required:
        # Generic score: there is no job to match against, so the question
        # becomes "is this profile searchable at all".
        distinct = len({s.lower() for s in owned})
        earned = round(
            SKILL_POINTS * min(distinct, GENERIC_SKILL_TARGET) / GENERIC_SKILL_TARGET
        )
        if distinct == 0:
            cards.append(_card(
                "no-skills", "high", "Add your skills",
                "Your profile has no skills listed, so employer searches and job "
                "matching cannot find you at all.",
                "Add skills", TAB_SKILLS, SKILL_POINTS,
            ))
        elif distinct < GENERIC_SKILL_TARGET:
            plural = "s" if distinct != 1 else ""
            cards.append(_card(
                "few-skills", "medium", "List more of your skills",
                f"Your profile lists {distinct} skill{plural}. Profiles with "
                f"{GENERIC_SKILL_TARGET} or more appear in noticeably more "
                "employer searches.",
                "Add skills", TAB_SKILLS, SKILL_POINTS - earned,
            ))
        return earned, [], [], cards

    matched, missing = skill_overlap(required, owned)

    # Second chance from the resume file: a skill written up in the resume but
    # never added to the skills tab is still evidence the candidate has it. It
    # earns the point and still produces a card, because employer search reads
    # the profile, not the PDF.
    from_text: list[str] = []
    still_missing: list[str] = []
    for skill in missing:
        bucket = from_text if _found_in_text(skill, data.raw_text) else still_missing
        bucket.append(skill)

    matched = matched + from_text
    total = len(matched) + len(still_missing)
    ratio = (len(matched) / total) if total else 0.0
    earned = round(SKILL_POINTS * ratio)

    if not owned:
        cards.append(_card(
            "no-skills", "high", "Add your skills",
            "Your profile has no skills listed, so nothing this job asks for can "
            "be matched against it.",
            "Add skills", TAB_SKILLS, SKILL_POINTS - earned,
        ))
    elif still_missing:
        shown = ", ".join(still_missing[:3])
        more = len(still_missing) - 3
        tail = f" and {more} more" if more > 0 else ""
        cards.append(_card(
            "missing-skills", "high" if ratio < 0.6 else "medium",
            "Add the skills this role asks for",
            f"This job lists {shown}{tail}, which your profile does not mention. "
            "Add any you actually have - employers filter on exactly these.",
            "Add skills", TAB_SKILLS, SKILL_POINTS - earned,
        ))

    if from_text:
        shown = ", ".join(from_text[:3])
        cards.append(_card(
            "skills-only-in-resume", "medium",
            "Move skills from your resume onto your profile",
            f"{shown} appears in your resume but not on your profile. Employer "
            "search reads your profile, so it is invisible where it counts.",
            "Add skills", TAB_SKILLS, 0,
        ))

    return earned, matched, still_missing, cards


# -- bucket 2: experience and impact (30) --------------------------------


def _score_experience(data, today: date) -> tuple[int, list[dict]]:
    """Five checks worth six points each."""
    roles = data.experience
    cards: list[dict] = []
    each = EXPERIENCE_POINTS // 5

    if not roles:
        cards.append(_card(
            "no-experience", "high", "Add your work experience",
            "Your profile has no roles listed. Employers screen on experience "
            "first, so an empty history usually ends the review there.",
            "Add experience", TAB_EXPERIENCE, EXPERIENCE_POINTS,
        ))
        return 0, cards

    earned = 0
    job = data.job or {}
    years = _float((data.profile or {}).get("total_experience_years"))

    # 1. Inside the band the job asks for. Being over the top of the band is
    #    not penalised - nobody should lose points for being experienced.
    minimum = job.get("experience_min")
    if minimum is None:
        if years > 0:
            earned += each
        else:
            cards.append(_card(
                "add-experience-years", "medium",
                "Add your total years of experience",
                "Your profile does not say how much experience you have, so "
                "experience filters skip you.",
                "Update experience", TAB_EXPERIENCE, each,
            ))
    elif years >= _float(minimum):
        earned += each
    else:
        cards.append(_card(
            "experience-below-band", "medium", "Show all of your experience",
            f"This role asks for {_float(minimum):g}+ years and your profile "
            f"shows {years:g}. If you have earlier roles you have not listed, "
            "adding them closes the gap.",
            "Update experience", TAB_EXPERIENCE, each,
        ))

    # 2. A current or recent role.
    cutoff = today - timedelta(days=RECENT_ROLE_DAYS)
    recent = any(
        role.get("is_current") or ((_as_date(role.get("end_date")) or date.min) >= cutoff)
        for role in roles
    )
    if recent:
        earned += each
    else:
        cards.append(_card(
            "no-current-role", "medium", "Add your current or most recent role",
            "Your most recent listed role ended a while ago. Employers read a "
            "gap at the top of a profile as out of date.",
            "Update experience", TAB_EXPERIENCE, each,
        ))

    # 3. Every role dated.
    undated = [
        role for role in roles
        if not _as_date(role.get("start_date"))
        or not (role.get("is_current") or _as_date(role.get("end_date")))
    ]
    if not undated:
        earned += each
    else:
        verb = "is" if len(undated) == 1 else "are"
        cards.append(_card(
            "missing-role-dates", "medium", "Add dates to every role",
            f"{len(undated)} of your {len(roles)} roles {verb} missing a start or "
            "end date. Automated screening treats an undated role as "
            "unverifiable.",
            "Update experience", TAB_EXPERIENCE, each,
        ))

    body = " ".join(_role_text(role) for role in roles)

    # 4. Numbers in the descriptions - the "quantify your achievements" check.
    if re.search(r"\d", body):
        earned += each
    else:
        cards.append(_card(
            "quantify-achievements", "medium", "Quantify your achievements",
            "None of your role descriptions contain a number. Team size, "
            "percentage improvement or volume handled makes the same work "
            "concrete to a reviewer.",
            "Edit roles", TAB_EXPERIENCE, each,
        ))

    # 5. Action verbs.
    low = body.lower()
    verbs = {verb for verb in ACTION_VERBS if re.search(rf"\b{verb}\b", low)}
    if len(verbs) >= 3:
        earned += each
    else:
        cards.append(_card(
            "add-action-verbs", "low", "Start your bullets with action verbs",
            "Your role descriptions read as duties rather than results. Openers "
            "like built, led, reduced or shipped describe what you did.",
            "Edit roles", TAB_EXPERIENCE, each,
        ))

    return earned, cards


# -- bucket 3: content quality (30) --------------------------------------

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


def _score_content(data) -> tuple[int, list[dict]]:
    """Six checks worth five points each."""
    profile = data.profile or {}
    cards: list[dict] = []
    each = CONTENT_POINTS // 6
    earned = 0

    # 1. Contact details.
    has_email = bool(str(profile.get("user_email") or "").strip())
    has_phone = bool(str(profile.get("phone") or "").strip())
    if has_email and has_phone:
        earned += each
    else:
        cards.append(_card(
            "add-contact-details", "high", "Add your contact details",
            "Your profile is missing an email address or a phone number, so an "
            "employer who wants to reach you cannot.",
            "Update details", TAB_PERSONAL, each,
        ))

    # 2. Professional summary.
    summary_words = len(str(profile.get("professional_summary") or "").split())
    if summary_words >= SUMMARY_MIN_WORDS:
        earned += each
    elif summary_words == 0:
        cards.append(_card(
            "add-summary", "high", "Add a professional summary",
            "Your profile has no summary. It is the first thing a recruiter "
            "reads, and without it they start from your job titles.",
            "Write summary", TAB_PERSONAL, each,
        ))
    else:
        cards.append(_card(
            "expand-summary", "medium", "Expand your professional summary",
            f"Your summary is {summary_words} words. Around {SUMMARY_MIN_WORDS} "
            "gives you room to say what you do, for whom, and what you are "
            "looking for next.",
            "Improve summary", TAB_PERSONAL, each,
        ))

    # 3. Education.
    if data.education:
        earned += each
    else:
        cards.append(_card(
            "add-education", "medium", "Add your education",
            "Your profile lists no education. Many employer filters require a "
            "qualification before a profile is shown at all.",
            "Add education", TAB_EDUCATION, each,
        ))

    # 4. Consistent dates in the resume file.
    if not _mixed_date_formats(data.raw_text):
        earned += each
    else:
        cards.append(_card(
            "fix-inconsistent-dates", "low", "Use one date format throughout",
            "Your resume mixes date formats. Parsers read your dates from the "
            "file, and mixed formats are where they get them wrong.",
            "Update resume", TAB_RESUME, each,
        ))

    # 5. Resume present and a sensible length.
    words = len(data.raw_text.split())
    if not data.resume:
        cards.append(_card(
            "upload-resume", "high", "Upload your resume",
            "You have no resume on file. Most employers ask for one before they "
            "will shortlist, however complete the profile is.",
            "Upload resume", TAB_RESUME, each,
        ))
    elif not data.raw_text:
        # The file exists but has never been parsed - 189 resumes, 66 parsed.
        # There is nothing to judge, so the benefit of the doubt goes to the
        # candidate rather than charging them for our own backlog.
        earned += each
    elif words < RESUME_MIN_WORDS:
        cards.append(_card(
            "resume-too-short", "medium", "Add more detail to your resume",
            f"Your resume is about {words} words. That is usually too little to "
            "show what you did rather than only where you worked.",
            "Update resume", TAB_RESUME, each,
        ))
    elif words > RESUME_MAX_WORDS:
        cards.append(_card(
            "resume-too-long", "low", "Tighten your resume",
            f"Your resume is about {words} words. Reviewers skim the first page, "
            "so the strongest material should be on it.",
            "Update resume", TAB_RESUME, each,
        ))
    else:
        earned += each

    # 6. Overall completeness, as the platform itself measures it.
    completion = _float(profile.get("completion_percentage"))
    if completion >= PROFILE_COMPLETE_PERCENT:
        earned += each
    else:
        cards.append(_card(
            "complete-profile", "medium", "Finish your profile",
            f"Your profile is {completion:g}% complete. The sections still empty "
            "are the ones employer filters use most.",
            "Complete profile", TAB_PERSONAL, each,
        ))

    return earned, cards


# -- assembly ------------------------------------------------------------


def _percent(points: int, total: int) -> int:
    """Bucket score as 0-100 - the widget draws these as progress bars."""
    if total <= 0:
        return 0
    return max(0, min(100, round(100 * points / total)))


def _order(cards: list[dict]) -> list[dict]:
    """Highest priority first, then biggest win, then id so ties never wobble."""
    return sorted(
        cards,
        key=lambda c: (PRIORITY_ORDER.get(c["priority"], 3), -c["points"], c["id"]),
    )


def _summary(score: int, potential: int, count: int, has_job: bool) -> str:
    target = "this role" if has_job else "the roles you are applying for"
    if score >= 85:
        lead = f"Your profile is a strong match for {target}."
    elif score >= 70:
        lead = f"Your profile matches {target} well."
    elif score >= 50:
        lead = f"Your profile covers some of what {target} asks for."
    else:
        lead = f"Your profile is missing several things {target} asks for."

    if not count:
        return f"{lead} There is nothing we would change right now."
    noun = "item" if count == 1 else "items"
    return f"{lead} Fixing the {count} {noun} below could take you to about {potential}."


def evaluate(data, today: date | None = None) -> dict:
    """Score a snapshot. Pure: no model, no I/O, no clock beyond `today`.

    `today` is injectable so the "recent role" check can be tested without
    rewriting the fixtures every two years.
    """
    today = today or date.today()

    skill_points, matched, missing, skill_cards = _score_skills(data)
    experience_points, experience_cards = _score_experience(data, today)
    content_points, content_cards = _score_content(data)

    score = max(0, min(100, skill_points + experience_points + content_points))
    band, headline = band_for(score)

    cards = _order(skill_cards + experience_cards + content_cards)
    limit = max(1, int(settings.resume_score_max_suggestions or 6))
    shown = cards[:limit]

    # Only the cards the candidate can actually see count towards the promise,
    # otherwise "could take you to about N" quotes work we never showed them.
    potential = min(100, score + sum(card["points"] for card in shown))

    ats_issues = [card["id"] for card in cards if card["id"] in ATS_CHECK_IDS]

    improvements = [
        {key: value for key, value in card.items() if key != "points"}
        for card in shown
    ]

    return {
        "score": score,
        "band": band,
        "headline": headline,
        "summary": _summary(score, potential, len(shown), bool(data.job)),
        "breakdown": [
            {"key": "skills", "label": "Skills & Keywords",
             "score": _percent(skill_points, SKILL_POINTS)},
            {"key": "experience", "label": "Experience & Impact",
             "score": _percent(experience_points, EXPERIENCE_POINTS)},
            {"key": "content", "label": "Content Quality",
             "score": _percent(content_points, CONTENT_POINTS)},
        ],
        "matched_keywords": matched,
        "missing_keywords": missing,
        "improvements": improvements,
        "ats_issues": ats_issues,
        "bucket_points": {
            "skills": skill_points,
            "experience": experience_points,
            "content": content_points,
        },
    }
