"""Deterministic personal-field enrichment, applied post-merge.

The LLM reliably copies fields that are literally labelled in the resume but
routinely drops fields that require a small, deterministic inference the source
text fully supports:

- country from an "+91 ..." phone number
- nationality from a known country ("India" -> "Indian")
- state/city from a postal address that names a known city
- address block that the LLM skipped even though it sits under an "Address:" label
- gender from a common first name (conservative, curated list only)

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


# ── gender (conservative, curated) ─────────────────────────────────────────
# Deliberately small: only unambiguous, common Indian given names. Anything
# not listed stays empty — a wrong guess is worse than blank.
_MALE_NAMES = {
    "amit", "rahul", "raj", "rajesh", "suresh", "ramesh", "vijay", "vikram",
    "ravi", "anil", "sunil", "arun", "ashok", "manoj", "sanjay", "sandeep",
    "deepak", "prashant", "prakash", "gaurang", "gaurangsinh", "abhinandan",
    "abhishek", "arjun", "karthik", "krishna", "mohit", "nikhil", "pankaj",
    "rohit", "sachin", "saurabh", "shyam", "vinod", "yash", "gobhi", "naveen",
    "gopal", "harish", "jitendra", "kiran", "mahesh", "narendra", "pradeep",
    "praveen", "rakesh", "shiva", "srinivas", "venkat", "aditya", "akash",
}
_FEMALE_NAMES = {
    "priya", "pooja", "neha", "anjali", "kavya", "divya", "shreya", "sneha",
    "swati", "ananya", "aishwarya", "deepa", "meena", "nisha", "pallavi",
    "rekha", "sangeeta", "seema", "shruti", "sunita", "sushma", "vidya",
    "lakshmi", "asha", "geeta", "kavitha", "manisha", "radha", "ritu",
    "sarita", "usha", "vandana", "bhavana", "chitra", "jaya", "kalpana",
}


def guess_gender(first_name: str) -> str:
    """Best-effort gender from a common first name. "" when uncertain."""
    key = (first_name or "").strip().lower().split()[0] if first_name.strip() else ""
    if key in _MALE_NAMES:
        return "Male"
    if key in _FEMALE_NAMES:
        return "Female"
    return ""


# ── headline / summary cleanup ─────────────────────────────────────────────

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def headline_is_fabricated(headline: str, summary: str) -> bool:
    """True if the 'headline' is really just (the start of) the summary — the
    LLM's most common headline hallucination. Safe: only fires on containment."""
    h, s = _norm(headline), _norm(summary)
    if not h or not s:
        return False
    return h in s or s.startswith(h[:40])


_SUMMARY_LABEL_RE = re.compile(
    r"^\s*(?:career\s+objective|carrier\s+objective|professional\s+summary|"
    r"profile\s+summary|executive\s+summary|about\s+me|objective|summary|profile)"
    r"\s*[:\-]?\s*",
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
