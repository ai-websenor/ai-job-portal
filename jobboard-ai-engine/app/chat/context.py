"""Assembles the grounded context a chat turn is allowed to answer from.

One rule drives this module: a field that is absent must not appear in the
prompt at all. The previous prompt rendered empty columns as literal
placeholders — `Location: N/A (, )`, `Experience: N/A (?-? years)` — and the
model dutifully copied them into answers or, worse, filled the blanks in with
plausible inventions. Dropping the line entirely is what makes "I don't have
that information" an honest answer instead of a lie about a populated column.

The second job here is deciding which topics are actually answerable. That set
drives the follow-up suggestions, so the UI can only ever offer a question the
context can answer.
"""

import html
import logging
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import date, datetime

from app.config import settings
from app.db import (
    DatabaseError,
    fetch_job_for_chat,
    fetch_job_screening_topics,
    fetch_user_profile,
)

logger = logging.getLogger(__name__)

COMPANY_DESCRIPTION_CHARS = 1200
FREE_TEXT_CHARS = 600
SUMMARY_CHARS = 700
MAX_EXPERIENCE_ENTRIES = 4
MAX_EDUCATION_ENTRIES = 3
MAX_CANDIDATE_SKILLS = 30
CACHE_MAX_ENTRIES = 512

# Topic groups exist so follow-up suggestions can be spread across genuinely
# different subjects. The old prompt asked a 3B model to enforce this itself and
# it routinely returned three rewordings of the same question.
TOPIC_ROLE = "role"
TOPIC_COMPANY = "company"
TOPIC_LOGISTICS = "logistics"
TOPIC_FIT = "fit"


@dataclass(frozen=True)
class Topic:
    key: str
    group: str
    question: str


# Ordered by how often candidates actually ask. `key` is matched against the
# conversation so a topic already discussed stops being suggested.
TOPICS: tuple[Topic, ...] = (
    Topic("skills", TOPIC_ROLE, "What skills are required?"),
    Topic("responsibilities", TOPIC_ROLE, "What does this role involve?"),
    Topic("experience", TOPIC_ROLE, "How much experience is needed?"),
    Topic("qualification", TOPIC_ROLE, "What qualifications are required?"),
    Topic("certification", TOPIC_ROLE, "Are certifications required?"),
    Topic("job_type", TOPIC_ROLE, "Is this a full-time role?"),
    Topic("screening", TOPIC_ROLE, "What will they ask me?"),
    Topic("company", TOPIC_COMPANY, "Tell me about the company"),
    Topic("culture", TOPIC_COMPANY, "What is the culture like?"),
    Topic("benefits", TOPIC_COMPANY, "What benefits are offered?"),
    Topic("industry", TOPIC_COMPANY, "What industry is this?"),
    Topic("company_size", TOPIC_COMPANY, "How big is the company?"),
    Topic("salary", TOPIC_LOGISTICS, "What is the salary range?"),
    Topic("work_mode", TOPIC_LOGISTICS, "Is remote work possible?"),
    Topic("location", TOPIC_LOGISTICS, "Where is this job based?"),
    Topic("deadline", TOPIC_LOGISTICS, "When do applications close?"),
    Topic("travel", TOPIC_LOGISTICS, "Is travel required?"),
    Topic("immigration", TOPIC_LOGISTICS, "Any visa requirements?"),
    Topic("fit", TOPIC_FIT, "Am I a good fit for this?"),
    Topic("gaps", TOPIC_FIT, "What skills am I missing?"),
)

# Words that mean a topic has already been covered, so it is not re-suggested.
TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "skills": ("skill", "tech stack", "technolog", "tools"),
    "responsibilities": ("responsib", "day to day", "day-to-day", "role involve", "duties", "what will i do"),
    "experience": ("experience", "years", "seniority", "fresher"),
    "qualification": ("qualif", "degree", "education", "graduat"),
    "certification": ("certif",),
    "job_type": ("full time", "full-time", "part time", "part-time", "contract", "intern", "job type"),
    "screening": ("screening", "questions they", "ask me", "interview question"),
    "company": ("company", "about them", "who are they", "organisation", "organization"),
    "culture": ("culture", "work environment", "team environment"),
    "benefits": ("benefit", "perk", "insurance", "pto", "leave"),
    "industry": ("industry", "sector", "domain"),
    "company_size": ("size", "how many employee", "headcount", "how big"),
    "salary": ("salary", "pay", "ctc", "compensation", "package", "stipend"),
    "work_mode": ("remote", "hybrid", "onsite", "on-site", "work from home", "wfh", "work mode"),
    "location": ("location", "where", "city", "based in", "office"),
    "deadline": ("deadline", "last date", "closing", "close", "apply by"),
    "travel": ("travel", "relocat"),
    "immigration": ("visa", "immigration", "sponsor", "work permit"),
    "fit": ("good fit", "suitable", "match", "am i right", "should i apply", "chances"),
    "gaps": ("missing", "gap", "lack", "improve", "weak"),
}


# ── Text hygiene ────────────────────────────────

_LIST_ITEM_RE = re.compile(r"<li[^>]*>", re.I)
# `</li>` is deliberately absent: the opening `<li>` already inserts the newline,
# and closing it again leaves a blank line between every bullet.
_BREAK_RE = re.compile(r"<br\s*/?>|</(p|div|ul|ol|h[1-6]|tr)\s*>", re.I)
_SCRIPT_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.I | re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_INLINE_WS_RE = re.compile(r"[ \t ​]+")
_BLANK_LINES_RE = re.compile(r"\n{3,}")


def clean_text(value, limit: int | None = None) -> str:
    """Flatten rich-text HTML to plain text, then bound its length.

    Job descriptions are authored in a WYSIWYG editor and arrive as HTML that
    regularly runs past 20k characters. The model's context window is 12k tokens
    for everything — system prompt, candidate profile and conversation included
    — so an unbounded description evicts the very instructions that keep the
    answer grounded, and the model starts improvising.
    """
    if value in (None, ""):
        return ""

    text = str(value)
    if "<" in text and ">" in text:
        text = _SCRIPT_RE.sub(" ", text)
        text = _LIST_ITEM_RE.sub("\n- ", text)
        text = _BREAK_RE.sub("\n", text)
        text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    text = _INLINE_WS_RE.sub(" ", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = _BLANK_LINES_RE.sub("\n\n", text).strip()

    if limit and len(text) > limit:
        text = _truncate(text, limit)
    return text


def _truncate(text: str, limit: int) -> str:
    """Cut at the latest natural boundary so the model never reads a half word."""
    cut = text[:limit]
    for separator in ("\n", ". ", "; ", " "):
        index = cut.rfind(separator)
        if index > limit * 0.6:
            return cut[:index].rstrip(" .,;:-") + " …"
    return cut.rstrip() + " …"


def _clean_list(values, limit: int = 40) -> list[str]:
    """De-duplicate a text array case-insensitively, preserving employer order."""
    out: list[str] = []
    seen: set[str] = set()
    for raw in values or []:
        item = clean_text(raw, 80)
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            out.append(item)
        if len(out) >= limit:
            break
    return out


def _clean_enum_list(values, limit: int = 40) -> list[str]:
    """De-duplicated list of enum tokens, rendered as labels."""
    return [_humanize(v) for v in _clean_list(values, limit)]


def _humanize(value: str) -> str:
    """Render a stored enum token as label text: `full_time` -> `Full time`.

    Leaves anything that is already prose, an acronym, or a range like `51-200`
    untouched — the model reads these values verbatim into its answers, and
    "This is a full_time position" is exactly the kind of output that reads as
    broken to a candidate.
    """
    if not value or " " in value:
        return value
    if "_" in value and re.fullmatch(r"[a-z0-9_]+", value):
        return value.replace("_", " ").capitalize()
    if value.isalpha() and value.islower():
        return value.capitalize()
    return value


def _format_date(value) -> str:
    if isinstance(value, (datetime, date)):
        return value.strftime("%d %b %Y")
    return clean_text(value, 40)


# Pay rates that mean the stored figure is a yearly total, so it can be shown
# in lakhs per annum — the unit Indian candidates actually think in.
_ANNUAL_RATES = ("year", "annual", "annum", "lpa", "pa")


def _format_money(amount, annual: bool) -> str:
    try:
        number = float(amount)
    except (TypeError, ValueError):
        return ""
    if number <= 0:
        return ""
    if annual and number >= 100000:
        lakhs = f"{number / 100000:.2f}".rstrip("0").rstrip(".")
        return f"{lakhs} LPA"
    return f"{int(number):,}"


# ── Context object ──────────────────────────────


@dataclass
class ChatContext:
    job_id: str
    job_title: str = ""
    company_name: str = ""
    candidate_name: str = ""
    has_profile: bool = False
    is_open: bool = True
    facts: list[tuple[str, str]] = field(default_factory=list)
    sections: list[tuple[str, str]] = field(default_factory=list)
    candidate_block: str = ""
    topics: set[str] = field(default_factory=set)
    # Topic key -> the exact wording for that fact. Lets the fallback answerer
    # reply from the row itself when the model is unavailable, without having to
    # re-parse the rendered prompt.
    values: dict[str, str] = field(default_factory=dict)
    candidate_skills: list[str] = field(default_factory=list)
    job_skills: list[str] = field(default_factory=list)

    def record(self, topic: str, value: str) -> None:
        if value:
            self.topics.add(topic)
            self.values[topic] = value

    def render_job(self) -> str:
        parts = []
        if self.facts:
            lines = "\n".join(f"- {label}: {value}" for label, value in self.facts)
            parts.append(f"## Job facts\n{lines}")
        for heading, body in self.sections:
            parts.append(f"## {heading}\n{body}")
        return "\n\n".join(parts)

    def available_topics(self) -> list[Topic]:
        return [t for t in TOPICS if t.key in self.topics]


# ── Lookup cache ────────────────────────────────
#
# Chat re-reads the same job and profile on every single message of a session.
# Without this, a ten-message conversation is ten full job reads plus seventy
# profile queries, all returning identical rows.

_cache: dict[str, tuple[float, object]] = {}
_cache_lock = threading.Lock()


def _cached(key: str, loader):
    ttl = settings.chat_context_ttl_seconds
    now = time.time()

    with _cache_lock:
        entry = _cache.get(key)
        if entry and now - entry[0] < ttl:
            return entry[1]

    value = loader()

    with _cache_lock:
        if len(_cache) >= CACHE_MAX_ENTRIES:
            for stale_key, (stamp, _) in list(_cache.items()):
                if now - stamp >= ttl:
                    _cache.pop(stale_key, None)
            if len(_cache) >= CACHE_MAX_ENTRIES:
                _cache.pop(next(iter(_cache)), None)
        _cache[key] = (now, value)
    return value


def clear_cache() -> None:
    """Drop cached lookups. Used by tests and after profile writes."""
    with _cache_lock:
        _cache.clear()


def load_job(job_id: str) -> dict | None:
    return _cached(f"job:{job_id}", lambda: fetch_job_for_chat(job_id))


def load_profile(user_id: str) -> dict | None:
    try:
        return _cached(f"profile:{user_id}", lambda: fetch_user_profile(user_id))
    except DatabaseError:
        # A missing profile must degrade to a generic answer, not a failed turn.
        logger.warning("Profile lookup failed for %s, continuing without it", user_id)
        return None


def load_screening(job_id: str) -> list[str]:
    return _cached(f"screening:{job_id}", lambda: fetch_job_screening_topics(job_id))


# ── Builders ────────────────────────────────────


def build_context(job: dict, profile: dict | None = None,
                  screening: list[str] | None = None) -> ChatContext:
    """Turn raw rows into the exact text the model is allowed to see."""
    ctx = ChatContext(job_id=str(job.get("id") or ""))
    _add_job_facts(ctx, job)
    _add_job_sections(ctx, job, screening or [])
    _add_company(ctx, job)
    if profile:
        _add_candidate(ctx, profile)
    return ctx


def _add_job_facts(ctx: ChatContext, job: dict) -> None:
    ctx.job_title = clean_text(job.get("title"), 120)
    if ctx.job_title:
        ctx.facts.append(("Title", ctx.job_title))

    status = (job.get("status") or "").lower()
    ctx.is_open = bool(job.get("is_active")) and status in ("active", "")
    deadline = job.get("deadline")
    if isinstance(deadline, (datetime, date)):
        deadline_date = deadline.date() if isinstance(deadline, datetime) else deadline
        if deadline_date < date.today():
            ctx.is_open = False

    location_bits = [clean_text(job.get(k), 80) for k in ("city", "state", "country")]
    location = ", ".join(b for b in location_bits if b) or clean_text(job.get("location"), 120)
    if location:
        ctx.facts.append(("Location", location))
        ctx.record("location", location)

    work_mode = _clean_enum_list(job.get("work_mode"))
    if work_mode:
        ctx.facts.append(("Work mode", ", ".join(work_mode)))
        ctx.record("work_mode", ", ".join(work_mode))

    job_type = _clean_enum_list(job.get("job_type"))
    for extra_key in ("employment_type", "engagement_type"):
        extra = _humanize(clean_text(job.get(extra_key), 60))
        if extra and extra.lower() not in {j.lower() for j in job_type}:
            job_type.append(extra)
    if job_type:
        ctx.facts.append(("Job type", ", ".join(job_type)))
        ctx.record("job_type", ", ".join(job_type))

    experience = _format_experience(job)
    if experience:
        ctx.facts.append(("Experience required", experience))
        ctx.record("experience", experience)

    salary = _format_salary(job)
    if salary:
        ctx.facts.append(("Salary", salary))
        ctx.record("salary", salary)

    ctx.job_skills = _clean_list(job.get("skills"))
    if ctx.job_skills:
        ctx.facts.append(("Required skills", ", ".join(ctx.job_skills)))
        ctx.record("skills", ", ".join(ctx.job_skills))

    category = clean_text(job.get("sub_category_name") or job.get("category_name"), 80)
    if category:
        ctx.facts.append(("Category", category))

    deadline_text = _format_date(job.get("deadline"))
    if deadline_text:
        ctx.facts.append(("Application deadline", deadline_text))
        ctx.record("deadline", deadline_text)

    if not ctx.is_open:
        ctx.facts.append(("Listing status", "Closed — no longer accepting applications"))
    elif job.get("is_urgent"):
        ctx.facts.append(("Hiring urgency", "Urgent"))

    travel = clean_text(job.get("travel_requirements"), FREE_TEXT_CHARS)
    if travel:
        ctx.facts.append(("Travel", travel))
        ctx.record("travel", travel)

    immigration = _humanize(clean_text(job.get("immigration_status"), 120))
    if immigration:
        ctx.facts.append(("Work authorisation", immigration))
        ctx.record("immigration", immigration)


def _format_experience(job: dict) -> str:
    level = _humanize(clean_text(job.get("experience_level"), 60))
    low, high = job.get("experience_min"), job.get("experience_max")
    if low is not None and high is not None:
        span = f"{low}-{high} years"
    elif low is not None:
        span = f"{low}+ years"
    elif high is not None:
        span = f"up to {high} years"
    else:
        span = ""
    if level and span:
        return f"{level} ({span})"
    return level or span


def _format_salary(job: dict) -> str:
    """Honour `show_salary`.

    The employer's decision to hide the range is a product setting, and the old
    context ignored it — the bot would happily read out a range the job page
    itself refuses to display.
    """
    if job.get("show_salary") is False:
        return ""

    rate = clean_text(job.get("pay_rate"), 40)
    annual = not rate or any(word in rate.lower() for word in _ANNUAL_RATES)

    low = _format_money(job.get("salary_min"), annual)
    high = _format_money(job.get("salary_max"), annual)
    if not low and not high:
        return ""

    if low and high:
        amount = f"₹{low} - ₹{high}"
    else:
        amount = f"From ₹{low}" if low else f"Up to ₹{high}"

    # An annual figure already carries its unit in "LPA"; anything else needs
    # the employer's own wording so "50,000" is not read as a yearly salary.
    return amount if annual else f"{amount} {rate}".strip()


def _add_job_sections(ctx: ChatContext, job: dict, screening: list[str]) -> None:
    description = clean_text(job.get("description"), settings.chat_job_description_chars)
    if description:
        ctx.sections.append(("Job description", description))
        ctx.record("responsibilities", description)

    qualification = clean_text(job.get("qualification"), FREE_TEXT_CHARS)
    if qualification:
        ctx.sections.append(("Required qualifications", qualification))
        ctx.record("qualification", qualification)

    certification = clean_text(job.get("certification"), FREE_TEXT_CHARS)
    if certification:
        ctx.sections.append(("Required certifications", certification))
        ctx.record("certification", certification)

    job_benefits = clean_text(job.get("job_benefits"), FREE_TEXT_CHARS)
    if job_benefits:
        ctx.sections.append(("Benefits offered with this role", job_benefits))
        ctx.record("benefits", job_benefits)

    questions = [clean_text(q, 200) for q in screening]
    questions = [q for q in questions if q]
    if questions:
        listed = "\n".join(f"- {q}" for q in questions)
        ctx.sections.append(("Screening questions asked when applying", listed))
        ctx.record("screening", "; ".join(questions))


def _add_company(ctx: ChatContext, job: dict) -> None:
    ctx.company_name = clean_text(job.get("company_name"), 120)
    if not ctx.company_name:
        return

    ctx.topics.add("company")
    details = []

    tagline = clean_text(job.get("tagline"), 200)
    if tagline:
        details.append(f"- Tagline: {tagline}")

    industry = clean_text(job.get("industry"), 80)
    if industry:
        details.append(f"- Industry: {industry}")
        ctx.record("industry", industry)

    size = _humanize(clean_text(job.get("company_size"), 60))
    if size:
        details.append(f"- Size: {size}")
        ctx.record("company_size", size)

    company_type = _humanize(clean_text(job.get("company_type"), 60))
    if company_type:
        details.append(f"- Type: {company_type}")

    established = job.get("year_established")
    if established:
        details.append(f"- Established: {established}")

    headquarters = clean_text(job.get("headquarters"), 120)
    if headquarters:
        details.append(f"- Headquarters: {headquarters}")

    if job.get("company_verified"):
        details.append("- Verified employer on this platform: yes")

    description = clean_text(job.get("company_description"), COMPANY_DESCRIPTION_CHARS)
    if description:
        details.append(f"- About: {description}")
        ctx.record("company", description)

    mission = clean_text(job.get("mission"), FREE_TEXT_CHARS)
    if mission:
        details.append(f"- Mission: {mission}")

    culture = clean_text(job.get("culture"), FREE_TEXT_CHARS)
    if culture:
        details.append(f"- Culture: {culture}")
        ctx.record("culture", culture)

    benefits = clean_text(job.get("company_benefits"), FREE_TEXT_CHARS)
    if benefits:
        details.append(f"- Company-wide benefits: {benefits}")
        # A job-level benefits block is more specific, so it wins if both exist.
        if "benefits" not in ctx.values:
            ctx.record("benefits", benefits)

    if details:
        ctx.sections.append((f"About {ctx.company_name}", "\n".join(details)))


def _add_candidate(ctx: ChatContext, profile: dict) -> None:
    """Render the candidate's professional history — and nothing else.

    `fetch_user_profile` does `SELECT p.*`, which carries phone, date of birth,
    gender and postal address. None of that helps answer a question about a job,
    and anything placed here can be echoed back by the model, so the field list
    below is an allow-list rather than a formatting choice.
    """
    first = clean_text(profile.get("first_name"), 60)
    last = clean_text(profile.get("last_name"), 60)
    ctx.candidate_name = first
    ctx.has_profile = True
    ctx.topics.update({"fit", "gaps"})

    lines = []
    full_name = " ".join(p for p in (first, last) if p)
    if full_name:
        lines.append(f"- Name: {full_name}")

    headline = clean_text(profile.get("headline"), 200)
    if headline:
        lines.append(f"- Headline: {headline}")

    years = profile.get("total_experience_years")
    if years is not None:
        pretty = f"{float(years):g}"
        lines.append(f"- Total experience: {pretty} years")

    where = ", ".join(
        p for p in (clean_text(profile.get("city"), 80), clean_text(profile.get("state"), 80)) if p
    )
    if where:
        lines.append(f"- Based in: {where}")

    skills = []
    for skill in profile.get("skills") or []:
        name = clean_text(skill.get("name"), 60)
        if not name:
            continue
        level = clean_text(skill.get("proficiency_level"), 30)
        skill_years = skill.get("years_of_experience")
        detail = ", ".join(
            p for p in (level, f"{skill_years} yrs" if skill_years is not None else "") if p
        )
        skills.append(f"{name} ({detail})" if detail else name)
        ctx.candidate_skills.append(name)
        if len(skills) >= MAX_CANDIDATE_SKILLS:
            break
    if skills:
        lines.append(f"- Skills: {', '.join(skills)}")

    experience_lines = []
    for role in (profile.get("experience") or [])[:MAX_EXPERIENCE_ENTRIES]:
        title = clean_text(role.get("job_title") or role.get("designation"), 120)
        company = clean_text(role.get("company_name"), 120)
        if not title and not company:
            continue
        span = _format_span(role.get("start_date"), role.get("end_date"), role.get("is_current"))
        header = " at ".join(p for p in (title, company) if p)
        experience_lines.append(f"  - {header}{f' ({span})' if span else ''}")
        used = _clean_list(role.get("skills_used"), 10)
        if used:
            experience_lines.append(f"    Skills used: {', '.join(used)}")
    if experience_lines:
        lines.append("- Work history:")
        lines.extend(experience_lines)

    education_lines = []
    for record in (profile.get("education") or [])[:MAX_EDUCATION_ENTRIES]:
        degree = clean_text(record.get("degree"), 120)
        study_field = clean_text(record.get("field_of_study"), 120)
        institution = clean_text(record.get("institution"), 160)
        label = ", ".join(p for p in (degree, study_field) if p)
        entry = " — ".join(p for p in (label, institution) if p)
        if entry:
            education_lines.append(f"  - {entry}")
    if education_lines:
        lines.append("- Education:")
        lines.extend(education_lines)

    certifications = []
    for cert in (profile.get("certifications") or [])[:5]:
        name = clean_text(cert.get("name"), 120)
        issuer = clean_text(cert.get("issuing_organization"), 120)
        if name:
            certifications.append(f"{name} ({issuer})" if issuer else name)
    if certifications:
        lines.append(f"- Certifications: {', '.join(certifications)}")

    summary = clean_text(profile.get("professional_summary"), SUMMARY_CHARS)
    if summary:
        lines.append(f"- Summary: {summary}")

    ctx.candidate_block = "\n".join(lines)


def _format_span(start, end, is_current) -> str:
    start_text = _year_of(start)
    if is_current:
        return f"{start_text} - present" if start_text else "current"
    end_text = _year_of(end)
    if start_text and end_text:
        return f"{start_text} - {end_text}"
    return start_text or end_text or ""


def _year_of(value) -> str:
    if isinstance(value, (datetime, date)):
        return str(value.year)
    text = str(value or "")
    match = re.search(r"(19|20)\d{2}", text)
    return match.group(0) if match else ""


# ── Suggestions ─────────────────────────────────


def suggest_topics(ctx: ChatContext, discussed: str, limit: int = 3) -> list[str]:
    """Pick follow-up questions deterministically from what the context supports.

    Asking the model to invent suggestions produced two failure modes at once:
    questions about data the context did not contain (deadlines, interview
    rounds, team size), and three near-identical rewordings of whatever was just
    answered. Selecting from `ctx.topics` makes the first impossible, and
    rotating across topic groups makes the second impossible.
    """
    haystack = discussed.lower()
    groups_used: set[str] = set()
    picked: list[str] = []

    def unasked(topic: Topic) -> bool:
        return not any(word in haystack for word in TOPIC_KEYWORDS.get(topic.key, ()))

    candidates = [t for t in ctx.available_topics() if unasked(t)]

    # First pass: one per group, so the three chips never overlap in subject.
    for topic in candidates:
        if topic.group in groups_used:
            continue
        groups_used.add(topic.group)
        picked.append(topic.question)
        if len(picked) >= limit:
            return picked

    # Second pass: fill remaining slots with any other supported topic.
    for topic in candidates:
        if topic.question not in picked:
            picked.append(topic.question)
            if len(picked) >= limit:
                break
    return picked[:limit]
