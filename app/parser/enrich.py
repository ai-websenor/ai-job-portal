"""Deterministic personal-field enrichment, applied post-merge.

The LLM reliably copies fields that are literally labelled in the resume but
routinely drops fields that require a small, deterministic inference the source
text fully supports:

- country from an "+91 ..." phone number
- nationality from a known country ("India" -> "Indian")
- state/city from a postal address that names a known city
- address block that the LLM skipped even though it sits under an "Address:" label

Gender is deliberately NOT inferred here — it is kept only when the resume
states it explicitly.

It also cleans two recurring LLM output defects:

- a fabricated headline that is really just the first line of the summary
- a professionalSummary that carries its own section label / embedded newlines

Everything here is derived ONLY from the source text (or from another field the
source already grounds), so nothing is invented. Runs before apply_grounding.
"""

import re

from app.parser import geo

# ── phone ─────────────────────────────────────────────────────────────────

# Country calling code -> country name. Longest codes first matters for parsing.
_CC_COUNTRY = {
    "91": "India", "971": "United Arab Emirates", "1": "United States",
    "44": "United Kingdom", "61": "Australia", "65": "Singapore",
    "49": "Germany", "33": "France", "81": "Japan", "86": "China",
    "880": "Bangladesh", "94": "Sri Lanka", "977": "Nepal", "92": "Pakistan",
    "60": "Malaysia", "966": "Saudi Arabia", "974": "Qatar", "968": "Oman",
}


def normalize_phone(phone: str) -> str:
    """Canonicalize to '+<cc> <national>' with a single space and no inner
    separators. Bare 10-digit numbers are assumed Indian (+91) — this pipeline
    targets Indian resumes. Returns "" for junk, original for unrecognized shapes."""
    if not phone:
        return ""
    has_plus = phone.strip().startswith("+") or bool(re.match(r"\s*\(?\+", phone))
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 10:
        return phone.strip()

    if has_plus and len(digits) > 10:
        cc, national = digits[:-10], digits[-10:]
        return f"+{cc} {national}"
    if not has_plus:
        if len(digits) == 10:
            return f"+91 {digits}"
        if len(digits) == 11 and digits[0] == "0":
            return f"+91 {digits[1:]}"
        if len(digits) == 12 and digits.startswith("91"):
            return f"+91 {digits[2:]}"
    # 10 digits with a leading '+', or an unrecognized length: keep digits with +.
    return f"+{digits}" if has_plus else digits


def country_from_phone(phone: str) -> str:
    """Map a phone's country code to a country name, or "" if unknown."""
    m = re.match(r"\+(\d{1,3})", phone.strip())
    if not m:
        return ""
    cc = m.group(1)
    # Try longest prefix first (e.g. "971" before "9"/"97").
    for length in (3, 2, 1):
        if cc[:length] in _CC_COUNTRY and (len(cc) == length or length == 3):
            return _CC_COUNTRY.get(cc[:length], "")
    return _CC_COUNTRY.get(cc, "")


# ── nationality ───────────────────────────────────────────────────────────

_COUNTRY_NATIONALITY = {
    "india": "Indian", "united states": "American", "usa": "American",
    "us": "American", "united kingdom": "British", "uk": "British",
    "united arab emirates": "Emirati", "uae": "Emirati",
    "australia": "Australian", "canada": "Canadian", "singapore": "Singaporean",
    "germany": "German", "france": "French", "japan": "Japanese",
    "china": "Chinese", "bangladesh": "Bangladeshi", "sri lanka": "Sri Lankan",
    "nepal": "Nepali", "pakistan": "Pakistani", "malaysia": "Malaysian",
    "saudi arabia": "Saudi", "qatar": "Qatari", "oman": "Omani",
}


def nationality_for_country(country: str) -> str:
    """Return the demonym for a known country ('India' -> 'Indian'), else ""."""
    return _COUNTRY_NATIONALITY.get((country or "").strip().lower(), "")


# ── address ───────────────────────────────────────────────────────────────

# Labels that terminate an address block (next section starts).
_ADDR_STOP = (
    r"languages?|hobbies|interests|declaration|date\s*of\s*birth|dob|"
    r"nationality|marital|gender|phone|mobile|email|e-mail|references?|"
    r"passport|linkedin|skills?|strength"
)
_ADDR_RE = re.compile(
    r"(?:^|\n)[ \t]*"
    r"(?:permanent\s+|correspondence\s+|residential\s+|present\s+)?add(?:ress)?"
    r"[ \t]*[:\-][ \t]*"
    r"(?P<body>.+?)"
    rf"(?=\n[ \t]*(?:{_ADDR_STOP})\b|\n[ \t]*\n|\Z)",
    re.IGNORECASE | re.DOTALL,
)


def extract_address(raw_text: str) -> str:
    """Pull a labelled address block from the source text, joining wrapped
    lines with ', '. Returns "" when no 'Address:' label is present."""
    if not raw_text:
        return ""
    m = _ADDR_RE.search(raw_text)
    if not m:
        return ""
    body = m.group("body").strip()
    lines = [ln.strip(" \t,") for ln in body.splitlines() if ln.strip(" \t,")]
    addr = ", ".join(lines)
    return re.sub(r"\s+", " ", addr).strip(" ,")


def city_state_from_text(text: str) -> tuple[str, str]:
    """Find the first known Indian city named in `text` and return
    (City, State). Uses the geo city->state table. "" pair if none found.
    Requires whole-word matches so short city names don't match inside words."""
    if not text:
        return "", ""
    low = text.lower()
    for city, state in geo._CITY_TO_STATE.items():
        if len(city) < 4:
            continue
        if re.search(rf"\b{re.escape(city)}\b", low):
            return city.title(), state
    return "", ""


# ── headline / summary cleanup ─────────────────────────────────────────────

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def headline_is_fabricated(headline: str, summary: str) -> bool:
    """True if the 'headline' is really just (the start of) the summary — the
    LLM's most common headline hallucination.

    Guarded against wiping a legitimate SHORT title that merely happens to open
    the summary (e.g. headline 'Full Stack Developer', summary 'Full Stack
    Developer with 6+ years...'). A real headline is a short title; a fabricated
    one is a sentence lifted from the summary. So only fire when the headline is
    sentence-length (>=8 words) AND contained in / opens the summary."""
    h, s = _norm(headline), _norm(summary)
    if not h or not s:
        return False
    if len(h.split()) < 8:
        return False
    return h in s or s.startswith(h[:40])


_SUMMARY_LABEL_RE = re.compile(
    r"^\s*(?:career\s+objective|carrier\s+objective|professional\s+summary|"
    r"profile\s+summary|executive\s+summary|about\s+me|objective|summary|profile)"
    r"\b(?:\s*:\s*|\s+)",  # word boundary + colon/space, NOT a hyphen (compounds)
    re.IGNORECASE,
)


def clean_summary(summary: str) -> str:
    """Collapse embedded newlines/runs of whitespace to single spaces and strip
    a leading section label ('Objective', 'Summary', ...) the LLM left attached."""
    if not summary:
        return ""
    s = re.sub(r"\s+", " ", summary).strip()
    s = _SUMMARY_LABEL_RE.sub("", s).strip()
    return s


# ── date normalization ─────────────────────────────────────────────────────

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7,
    "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}


def normalize_date(value: str) -> str | None:
    """Best-effort conversion of a loose date string to YYYY-MM-DD.

    Handles: already-ISO, 'Mon YYYY', 'Mon-YYYY', 'Mon DD/YYYY', 'DD/MM/YYYY',
    'MM/YYYY', bare 'YYYY'. Leaves genuinely ambiguous values (e.g. academic
    ranges like '2006-07') unchanged so we never guess wrong. Returns the input
    untouched when it can't be confidently parsed; None stays None."""
    if not value:
        return value
    v = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return v

    # Month name + day + year: "Oct 11/2019", "Oct 11 2019"
    m = re.fullmatch(r"([A-Za-z]{3,9})[ \-.]*(\d{1,2})[ /\-.]+(\d{4})", v)
    if m and m.group(1)[:3].lower() in _MONTHS:
        mon = _MONTHS[m.group(1)[:3].lower()]
        return f"{int(m.group(3)):04d}-{mon:02d}-{int(m.group(2)):02d}"

    # Month name + year: "March 2001", "March-2001", "Jan 2020"
    m = re.fullmatch(r"([A-Za-z]{3,9})[ \-.]*(\d{4})", v)
    if m and m.group(1)[:3].lower() in _MONTHS:
        mon = _MONTHS[m.group(1)[:3].lower()]
        return f"{int(m.group(2)):04d}-{mon:02d}-01"

    # DD/MM/YYYY
    m = re.fullmatch(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})", v)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # MM/YYYY
    m = re.fullmatch(r"(\d{1,2})[/\-.](\d{4})", v)
    if m:
        mo, y = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12:
            return f"{y:04d}-{mo:02d}-01"

    # bare YYYY
    if re.fullmatch(r"\d{4}", v):
        return f"{v}-01-01"

    return value


# ── skill filtering ─────────────────────────────────────────────────────────

# Activity/duty verbs that lead a responsibility phrase the LLM sometimes
# misfiles as a skill ("Helping team", "Implementing new network setup").
# Deliberately excludes verbs that commonly head real skills (developing,
# designing, testing, programming) so we don't drop genuine competencies.
_NON_SKILL_LEAD = re.compile(
    r"^(?:helping|implementing|creating|managing|configuring|troubleshooting|"
    r"installing|maintaining|handling|monitoring|addressing|walking|guiding|"
    r"checking|viewing|recording|reporting|preparing|providing|attending|"
    r"analyzing|coordinating|logging)\b",
    re.IGNORECASE,
)
# Bare generic words that are never a concrete skill on their own.
_NON_SKILL_EXACT = {
    "application", "applications", "software", "softwares", "software's",
    "internet browser", "calls", "desktop calls", "laptop calls",
    "roles and responsibilities", "responsibilities",
}


def is_probable_non_skill(name: str) -> bool:
    """True when a 'skill' is really an activity/duty phrase, not a named
    technology. Conservative: fires only on a leading activity verb or a known
    generic word — no length heuristic, since real skills can be long (e.g.
    'Continuous Integration and Continuous Deployment')."""
    n = (name or "").strip()
    if not n:
        return True
    low = n.lower()
    if low in _NON_SKILL_EXACT:
        return True
    if _NON_SKILL_LEAD.match(low):
        return True
    return False


def filter_skills(skills, log=None):
    """Drop skill entries that are misclassified responsibility/duty phrases."""
    kept = []
    for s in skills:
        if is_probable_non_skill(s.skillName):
            if log:
                log(f"[deterministic] dropped non-skill {s.skillName!r}")
            continue
        kept.append(s)
    return kept


# ── education date re-grounding ─────────────────────────────────────────────

_YEAR_RE = re.compile(r"\b(19[5-9]\d|20[0-4]\d)\b")


def _anchor_window(edu, raw_text: str) -> str | None:
    """Locate the source region for an education entry and return it as the
    matched line plus the immediately adjacent lines (±1). Anchors on the
    longest reliable token (>=3) from degree, then fieldOfStudy, then
    institution — some layouts put the year on the degree line while the
    field/institution sits on the next line. Returns None with no anchor."""
    candidates = []
    for src, minlen in ((edu.degree, 3), (edu.fieldOfStudy, 4), (edu.institution, 4)):
        toks = [t for t in re.findall(r"[A-Za-z0-9]+", src or "") if len(t) >= minlen]
        if toks:
            candidates.append(max(toks, key=len))
    lines = raw_text.splitlines()
    for anchor in candidates:
        for i, line in enumerate(lines):
            if re.search(rf"\b{re.escape(anchor)}\b", line, re.IGNORECASE):
                lo, hi = max(0, i - 1), min(len(lines), i + 2)
                return "\n".join(lines[lo:hi])
    return None


def reground_education_dates(edu_list, raw_text: str, log=None):
    """Correct LLM-invented education date ranges from the source text.

    Targets the classic failure on 'YEAR Degree' layouts (e.g. '2007 B. E') where
    the LLM fabricates a start/end span and even borrows a neighbouring row's
    year. Only acts when the entry already has BOTH start and end set (the guess
    signature) AND the degree's own source line names year(s): a single year →
    endDate=that year, startDate=null (passing year); two years → start/end from
    those. Entries with a strong anchor but no year on their line, or with only
    one date already, are left untouched — no anchor, no change."""
    for edu in edu_list:
        if not (edu.startDate and edu.endDate):
            continue
        window = _anchor_window(edu, raw_text)
        if window is None:
            continue
        years = sorted({int(y) for y in _YEAR_RE.findall(window)})
        if not years:
            continue
        if len(years) == 1:
            new_start, new_end = None, f"{years[0]}-01-01"
        else:
            new_start, new_end = f"{years[0]}-01-01", f"{years[-1]}-01-01"
        if (new_start, new_end) != (edu.startDate, edu.endDate):
            if log:
                log(f"[deterministic] education {edu.degree!r} dates re-grounded "
                    f"{edu.startDate!r}/{edu.endDate!r} → {new_start!r}/{new_end!r}")
            edu.startDate, edu.endDate = new_start, new_end
    return edu_list
