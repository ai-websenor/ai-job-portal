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


# A phone number printed with an explicit '+CC' prefix in the source text. Only
# an explicit prefix implies a country — normalize_phone's market default (+91
# for bare 10-digit numbers) must never be read as evidence of nationality.
_SOURCE_PHONE_RE = re.compile(r"\+\s?\d[\d\s\-().]{8,20}")


def country_from_source_phone(raw_text: str) -> str:
    """Country implied by an explicit '+CC ...' phone number in the resume text.

    This is a derivation the source fully supports, so it survives grounding:
    the country code IS printed on the page even though the country name is not.
    """
    for m in _SOURCE_PHONE_RE.finditer(raw_text or ""):
        country = country_from_phone(normalize_phone(m.group(0)))
        if country:
            return country
    return ""


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
    """Pull an address block from the source text, joining wrapped lines with
    ', '. Prefers a labelled 'Address:' block; falls back to a 6-digit-PIN
    anchored block when the resume prints the address with no label (common on
    Indian CVs). Returns "" when neither is found."""
    if not raw_text:
        return ""
    m = _ADDR_RE.search(raw_text)
    if m:
        body = m.group("body").strip()
        lines = [ln.strip(" \t,") for ln in body.splitlines() if ln.strip(" \t,")]
        addr = ", ".join(lines)
        return re.sub(r"\s+", " ", addr).strip(" ,")
    return _address_from_pincode(raw_text)


# A contact/URL/section line that must not be pulled into an unlabelled address
# block collected above the PIN line.
_ADDR_CONTACT_RE = re.compile(
    r"(@|https?:|www\.|linkedin|github|phone|mobile|email|e-mail|\+\d)",
    re.IGNORECASE,
)
_PIN_RE = re.compile(r"\b\d{6}\b")


def _address_from_pincode(raw_text: str) -> str:
    """Extract an unlabelled address anchored on a 6-digit Indian PIN code.

    Takes the PIN line plus up to two contiguous lines above it, stopping at a
    blank line, a section header (ALL CAPS), or a contact line. Only returns the
    block when it names a known Indian city, so a stray 6-digit number never
    masquerades as an address."""
    lines = raw_text.splitlines()
    for i, ln in enumerate(lines):
        if not _PIN_RE.search(ln):
            continue
        block = [ln.strip(" \t,")]
        j = i - 1
        while j >= 0 and len(block) < 3:
            s = lines[j].strip(" \t,")
            if not s or s.isupper() or _ADDR_CONTACT_RE.search(s):
                break
            block.insert(0, s)
            j -= 1
        addr = ", ".join(x for x in block if x)
        addr = re.sub(r"\s+", " ", addr).strip(" ,")
        # Drop a bare 'Address' label line the walk-up may have pulled in.
        addr = re.sub(r"^address\s*[:,\-]?\s*", "", addr, flags=re.IGNORECASE).strip(" ,")
        if city_state_from_text(addr)[0]:
            return addr
    return ""


# Lines that mark the contact block — the candidate's own city sits within a
# line or two of these, never a client/work-location city buried in experience.
_CONTACT_ANCHOR_RE = re.compile(
    r"(@|\+\d|\blocation\b|\baddress\b|\bcity\b|\bphone\b|\bmobile\b|\bemail\b|\b\d{6}\b)",
    re.IGNORECASE,
)


def city_state_near_contact(text: str) -> tuple[str, str]:
    """Find a known city in the contact block only — the window of lines around
    a phone/email/location/PIN anchor. Safer than a whole-document scan, which
    would happily return a client or work-location city from the experience
    section instead of where the candidate lives."""
    if not text:
        return "", ""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if _CONTACT_ANCHOR_RE.search(line):
            # Tight window: the anchor line plus the next line only ('LOCATION'
            # on its own line is followed by the city). A wider window risks
            # reaching into the experience section below the contact block.
            lo, hi = max(0, i - 1), min(len(lines), i + 2)
            city, state = city_state_from_text("\n".join(lines[lo:hi]))
            if city:
                return city, state
    return "", ""


# "Nizamabad, TS." / "Pune - Maharashtra" — the state written beside the city,
# very often as a two-letter code the city→state table can't help with.
def state_beside_city(raw_text: str, city: str) -> str:
    """Return the full state name printed next to `city` in the source text.

    Indian resumes commonly abbreviate ("Nizamabad, TS."), which is why the
    LLM's correct expansion to "Telangana" has no literal support in the text.
    Resolving the code here lets that expansion survive grounding."""
    if not raw_text or not city:
        return ""
    pattern = re.compile(
        rf"\b{re.escape(city.strip())}\b\s*[,\-–]\s*([A-Za-z][A-Za-z .]{{1,24}})",
        re.IGNORECASE,
    )
    for m in pattern.finditer(raw_text):
        # Take only the segment up to the next separator: "TS. +91 79898..."
        token = re.split(r"[,\-–\n]", m.group(1))[0]
        resolved = geo.resolve_state_token(token, positional=True)
        if resolved:
            return resolved
    return ""


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


# Words that make a short line a job title rather than a section label or a
# stray fragment. Deliberately broad — the other filters do the rejecting.
_ROLE_WORD_RE = re.compile(
    r"\b(developer|engineer|programmer|analyst|consultant|architect|administrator|"
    r"admin|designer|manager|lead|specialist|scientist|tester|qa|sdet|devops|"
    r"intern|trainee|executive|officer|associate|accountant|recruiter|strategist|"
    r"writer|technician|coordinator|marketer|freelancer|researcher|instructor|"
    r"teacher|professional|expert|head|director|founder|stack)\b",
    re.IGNORECASE,
)

# Section labels that can otherwise look title-shaped ("PROFILE", "EXPERIENCE").
_SECTION_LABEL_RE = re.compile(
    r"^(education|educational\s+details?|academic|academics|certificat\w*|"
    r"technical\s+skills?|key\s+skills?|core\s+competenc\w*|skills?|tools?|"
    r"career\s+objective|carrier\s+objective|objective|profile\s+summary|"
    r"professional\s+summary|executive\s+summary|summary|profile|about\s+me|"
    r"work\s+experience|professional\s+experience|employment|experience|"
    r"projects?|project\s+details?|declaration|languages?|personal\s+details?|"
    r"personal\s+information|contact|contact\s+details?|achievements?|awards?|"
    r"hobbies|interests|strengths?|training|internships?|references?|"
    r"curriculum\s+vitae|resume|area\s+of\s+expertise|work\s+history)\b\s*:?\s*$",
    re.IGNORECASE,
)

# Glyphs PDF bullet lists leave at the head of a line (Wingdings arrows etc.).
_BULLET_PREFIX_RE = re.compile(r"^[\s•▪◦‣·\*\-–�]+")


def _clean_line(line: str) -> str:
    return _BULLET_PREFIX_RE.sub("", line or "").strip().strip("|·•-–— \t")


def _is_title_line(line: str, name_tokens: set[str]) -> bool:
    """True when a source line looks like the standalone role title printed
    under the candidate's name: short, role-worded, no contact data, no digits
    (a headline is a role, not '8 Years Experience'), not a section label."""
    text = _clean_line(line)
    if not text or len(text) > 60:
        return False
    if any(c.isdigit() for c in text):
        return False
    if "@" in text or re.search(r"https?:|www\.", text, re.IGNORECASE):
        return False
    words = text.split()
    if not (1 <= len(words) <= 8):
        return False
    # An unbalanced bracket means the line is the tail of a wrapped one
    # ("... ( DESKTOP SUPPORT" / "ENGINEER)"), not a standalone title.
    if text.count("(") != text.count(")"):
        return False
    if _SECTION_LABEL_RE.match(text):
        return False
    if not _ROLE_WORD_RE.search(text):
        return False
    # The name line itself often contains a role word by coincidence of surname.
    line_tokens = {t for t in _norm(text).split() if t}
    return not (line_tokens and line_tokens <= name_tokens)


def _name_line_index(lines: list[str], first_name: str, last_name: str) -> int:
    """Index of the line holding the candidate's name, or -1. Matched on the
    first name so a two-column PDF whose text order is scrambled still anchors.
    A longer line also counts when it OPENS with the full name — plenty of
    resumes print "Shabnam Siddiqui Sr. iOS developer" as one line."""
    first = _norm(first_name)
    if not first:
        return -1
    full = _norm(f"{first_name} {last_name}")
    for i, line in enumerate(lines):
        normalized = _norm(_clean_line(line))
        tokens = normalized.split()
        if not tokens:
            continue
        if len(tokens) <= 4 and (normalized == full or first in tokens):
            return i
        if last_name and len(tokens) <= 10 and normalized.startswith(f"{full} "):
            return i
    return -1


def _title_after_name(line: str, first_name: str, last_name: str) -> str:
    """Return the role title printed after the name on the SAME line, or ""."""
    text = _clean_line(line)
    name_words = [w for w in f"{first_name} {last_name}".split() if w]
    if not text or not name_words:
        return ""
    prefix = r"^\s*" + r"[\s,\-–|]+".join(re.escape(w) for w in name_words) + r"[\s,\-–|:]+"
    m = re.match(prefix, text, re.IGNORECASE)
    if not m:
        return ""
    rest = _clean_line(text[m.end():])
    return rest if _is_title_line(rest, set()) else ""


def headline_from_header(raw_text: str, first_name: str = "", last_name: str = "") -> str:
    """Recover the standalone role title printed near the candidate's name.

    Used when the LLM's headline is ungrounded — its classic failure is stitching
    every past job title into one string ("Associate Software Engineer | Senior
    Associate | Senior Software Engineer") when the resume header states a single
    role. Scans forward from the name line first (the title sits under the name),
    then backward, then the top of the document. Returns "" when nothing in the
    header block looks like a title."""
    if not raw_text:
        return ""
    lines = raw_text.splitlines()
    name_tokens = {t for t in _norm(f"{first_name} {last_name}").split() if t}
    name_idx = _name_line_index(lines, first_name, last_name)

    if name_idx >= 0:
        # Name and title on one line: "Shabnam Siddiqui Sr. iOS developer".
        same_line = _title_after_name(lines[name_idx], first_name, last_name)
        if same_line:
            return same_line
        windows = [
            range(name_idx + 1, min(len(lines), name_idx + 7)),
            range(max(0, name_idx - 3), name_idx),
        ]
    else:
        # No name anchor — only the very top of the page is safe to guess from.
        # A wider sweep starts pulling job titles out of the experience section,
        # which is the fabrication this function exists to undo.
        windows = [range(0, min(len(lines), 6))]

    for window in windows:
        for i in window:
            if _is_title_line(lines[i], name_tokens):
                return _clean_line(lines[i])
    return ""


def headline_on_single_source_line(headline: str, raw_text: str) -> bool:
    """True when the headline is printed verbatim on one line of the resume.

    A real headline is lifted from a single header line; a stitched-together one
    ("title A | title B | title C") never is, even though its words all occur
    somewhere on the page — which is exactly what fuzzy token coverage misses."""
    if not headline or not raw_text:
        return False
    target = _norm(headline)
    if not target:
        return False
    return any(target in _norm(_clean_line(line)) for line in raw_text.splitlines())


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


_CURRENT_MARKER_RE = re.compile(
    r"^(?:present|current|currently|ongoing|now|till\s*date|till\s*now|"
    r"till\s*present|until\s*now|to\s*date|contd\.?|continuing)$",
    re.IGNORECASE,
)


def is_current_marker(value: str) -> bool:
    """True when a date field holds an open-ended marker ('Present', 'Till Date',
    'Ongoing', …) rather than an actual date."""
    return bool(value) and bool(_CURRENT_MARKER_RE.match(value.strip()))


def normalize_date(value: str) -> str | None:
    """Best-effort conversion of a loose date string to YYYY-MM-DD.

    Handles: already-ISO, 'Mon YYYY', 'Mon-YYYY', 'Mon DD/YYYY', 'DD/MM/YYYY',
    'MM/YYYY', bare 'YYYY'. Leaves genuinely ambiguous values (e.g. academic
    ranges like '2006-07') unchanged so we never guess wrong. Returns the input
    untouched when it can't be confidently parsed; None stays None."""
    if not value:
        return value
    v = value.strip()
    # "Present"/"Current"/"Till date"/"Ongoing"/"Now" is not a date — it marks
    # an open end. Normalize to None so a live-role endDate is never a stray
    # word (the schema wants a date or null). isCurrent is set separately.
    if is_current_marker(v):
        return None
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


# ── education grade normalization ───────────────────────────────────────────

# The onboarding form and the profiles.education table accept a NUMERIC grade
# plus a gradeType of exactly "cgpa" or "percentage" (cgpa 0<g<=10, percentage
# 0<g<=100, at most 2 decimals). Anything else the LLM lifts off the page —
# "Passed out in 2007", "First Class", "A+" — is not storable and is dropped.
_CGPA_WORD = r"(?:c\.?g\.?p\.?a|s\.?g\.?p\.?a|g\.?p\.?a|c\.?p\.?i|grade\s*point)"
_PCT_WORD = r"(?:percentage|percent|marks|aggregate|score)"
_NUM = r"(\d{1,3}(?:\.\d{1,3})?)"

_GRADE_PATTERNS: tuple[tuple[str, str], ...] = (
    (rf"{_NUM}\s*%", "percentage"),
    (rf"{_NUM}\s*(?:out\s*of|/)\s*100\b", "percentage"),
    (rf"{_NUM}\s*(?:out\s*of|/)\s*10\b", "cgpa"),
    (rf"{_NUM}\s*{_PCT_WORD}", "percentage"),
    (rf"{_PCT_WORD}\s*[:\-–]?\s*(?:of\s*)?{_NUM}", "percentage"),
    (rf"{_NUM}\s*{_CGPA_WORD}", "cgpa"),
    (rf"{_CGPA_WORD}\s*[:\-–]?\s*(?:of\s*)?{_NUM}", "cgpa"),
)

_GRADE_TYPES = ("cgpa", "percentage")


def _format_grade(value: float) -> str:
    """Render a grade with at most 2 decimals and no trailing zeros — the shape
    the frontend's `^\\d*(\\.\\d{0,2})?$` validation accepts."""
    text = f"{round(value, 2):.2f}".rstrip("0").rstrip(".")
    return text or "0"


def normalize_grade(grade: str, grade_type: str = "") -> tuple[str, str]:
    """Convert a free-text grade into (numeric_grade, grade_type).

    Returns ("", "") when the value carries no usable number or falls outside
    the valid range — a stray year ("Passed out in 2007") or a class/letter
    grade must not reach a field the form validates as a number."""
    text = (grade or "").strip()
    declared = (grade_type or "").strip().lower()
    if declared not in _GRADE_TYPES:
        declared = ""
    if not text:
        return "", ""

    value: float | None = None
    kind = ""
    for pattern, pattern_kind in _GRADE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            value, kind = float(m.group(1)), pattern_kind
            break

    if value is None:
        # No unit marker: accept a bare number only, and let its magnitude pick
        # the type. Any surrounding prose ("Passed out in 2007") is a phrase, not
        # a grade, so anything beyond an optional trailing unit word is rejected.
        m = re.fullmatch(r"\s*(\d{1,3}(?:\.\d{1,3})?)\s*", text)
        if not m:
            return "", ""
        value = float(m.group(1))
        kind = declared or ("cgpa" if value <= 10 else "percentage")

    if declared and declared != kind and not re.search(r"%|/|out\s*of", text, re.IGNORECASE):
        # An explicit gradeType from the LLM wins over a magnitude guess, but not
        # over a unit printed in the value itself.
        kind = declared

    if kind == "cgpa" and not (0 < value <= 10):
        return "", ""
    if kind == "percentage" and not (0 < value <= 100):
        return "", ""
    return _format_grade(value), kind


_SOURCE_NUMBER_RE = re.compile(r"(?<![\d.])\d{1,3}(?:\.\d{1,3})?(?!\d)")


def grade_value_in_source(value: str, raw_text: str) -> bool:
    """True when the resume actually prints this number. Compared numerically so
    a source '8.50' still grounds a normalized '8.5'."""
    if not value or not raw_text:
        return False
    target = float(value)
    return any(
        abs(float(n) - target) < 1e-9 for n in _SOURCE_NUMBER_RE.findall(raw_text)
    )


def normalize_education_grades(edu_list, raw_text: str = "", log=None):
    """Normalize every entry's grade to a numeric value + gradeType, dropping
    values that are unusable or that name a number absent from the source."""
    for edu in edu_list:
        original = edu.grade or ""
        if not original:
            edu.gradeType = ""
            continue
        value, kind = normalize_grade(original, getattr(edu, "gradeType", ""))
        if value and raw_text and not grade_value_in_source(value, raw_text):
            if log:
                log(f"[deterministic] dropped ungrounded grade {original!r} (not in source)")
            value, kind = "", ""
        elif not value and log:
            log(f"[deterministic] dropped non-numeric grade {original!r}")
        elif value != original.strip() and log:
            log(f"[deterministic] grade normalized {original!r} → {value!r} ({kind})")
        edu.grade, edu.gradeType = value, kind
    return edu_list


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

# Duty gerunds that mark an activity phrase even when they sit at the END of a
# multi-word entry ('Camera viewing', 'Rules creating', 'End user outlook
# configuring'). These are never part of a named technology, so matching them
# as a whole word ANYWHERE is safe against real skills (which use nouns:
# 'Configuration', 'Management', 'Integration', not '-ing' verbs).
_NON_SKILL_GERUND = re.compile(
    r"\b(?:viewing|creating|configuring|checking|cheking|recording|reporting|"
    r"logging|guiding|walking|installing|troubleshooting|managing|handling|"
    r"monitoring|addressing|analyzing|coordinating|maintaining)\b",
    re.IGNORECASE,
)


def is_probable_non_skill(name: str) -> bool:
    """True when a 'skill' is really an activity/duty phrase, not a named
    technology. Conservative: fires on a leading activity verb, a duty gerund
    anywhere in a multi-word phrase, or a known generic word — no length
    heuristic, since real skills can be long (e.g. 'Continuous Integration and
    Continuous Deployment')."""
    n = (name or "").strip()
    if not n:
        return True
    # Normalize curly apostrophes so "Software's" (U+2019) matches the set.
    low = n.lower().replace("’", "'").replace("‘", "'")
    if low in _NON_SKILL_EXACT:
        return True
    if _NON_SKILL_LEAD.match(low):
        return True
    # Duty gerund only disqualifies a multi-word phrase — a lone gerund could be
    # a legitimate short skill in rare cases, but a phrase built around one is a
    # responsibility.
    if " " in low and _NON_SKILL_GERUND.search(low):
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


# Verbs that open a responsibility phrase. A named technology never starts with
# one, so a "technologies"/"skillsUsed" item beginning here is prose the LLM
# copied out of the responsibilities bullet next to it.
_NON_TECH_LEAD = re.compile(
    r"^(?:build|building|built|develop|developed|developing|development|design|"
    r"designed|designing|test|tested|testing|create|created|creating|implement|"
    r"implemented|implementing|work|worked|working|involve|involved|gather|"
    r"gathered|gathering|perform|performed|prepare|prepared|maintain|maintained|"
    r"support|supported|handle|handled|manage|managed|deploy|deployed|"
    r"responsible|assisted|coordinated|participated)\b",
    re.IGNORECASE,
)


def clean_tech_list(value: str) -> str:
    """Strip responsibility prose out of a comma-separated tech-stack field.

    The LLM routinely fills a project's `technologies` (or a job's `skillsUsed`)
    with the responsibilities bullet sitting beside it — "Designing and testing of
    Flows and Process builders, Design and deployed validation rules ...". Those
    items are already carried by `responsibilities`/`description`, so dropping
    them here loses nothing and stops duty phrases leaking into skills[] via
    harvest_skill_names."""
    if not value:
        return ""
    kept: list[str] = []
    for raw in re.split(r"\s*[,;|]\s*", value):
        item = raw.strip().strip(".").strip()
        if not item or len(item.split()) > 5:
            continue
        if _NON_TECH_LEAD.match(item) or is_probable_non_skill(item):
            continue
        kept.append(item)
    return ", ".join(kept)


# Present-tense employment phrasing. Indian resumes very often state the current
# job with no end date at all — "Working as a Senior Software Engineer in X" —
# leaving the LLM with nothing to set isCurrent from.
_PRESENT_ROLE_RE = re.compile(
    r"\b(?:currently|presently)\s+(?:working|employed|associated|serving)\b"
    r"|\bworking\s+(?:as|with|at|in|for|since)\b"
    r"|\bpresently\s+(?:with|at)\b",
    re.IGNORECASE,
)


def _norm_cmp(s: str) -> str:
    """Compare-only normalization: punctuation to spaces, so a curly apostrophe
    in the source still matches a straight one in the LLM's output."""
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def mark_current_from_present_tense(experiences, raw_text: str, log=None):
    """Set isCurrent on the one role the resume describes in the present tense.

    Only fires when NO entry is already marked current and exactly ONE entry
    matches a present-tense line — an ambiguous match is left alone rather than
    guessing which job is live."""
    if not experiences or not raw_text:
        return experiences
    if any(e.isCurrent for e in experiences):
        return experiences

    lines = [
        _norm_cmp(line) for line in raw_text.splitlines() if _PRESENT_ROLE_RE.search(line)
    ]
    if not lines:
        return experiences

    matches = []
    for exp in experiences:
        anchor = _norm_cmp(exp.companyName) or _norm_cmp(exp.title)
        if anchor and any(anchor in line for line in lines):
            matches.append(exp)
    if len(matches) == 1:
        matches[0].isCurrent = True
        matches[0].endDate = None
        if log:
            log(
                "[deterministic] marked "
                f"{matches[0].companyName or matches[0].title!r} current "
                "(resume states it in the present tense)"
            )
    return experiences


# Words that must appear in the source before an employmentType is believable.
# The LLM defaults to "full_time" on almost every resume despite the prompt
# forbidding it, which silently invents a contract term the candidate never gave.
_EMPLOYMENT_TYPE_MARKERS = {
    "full_time": ("full time", "full-time", "fulltime", "permanent"),
    "part_time": ("part time", "part-time", "parttime"),
    "contract": ("contract", "contractual", "contractor", "consultant"),
    "internship": ("intern", "internship", "trainee", "apprentice"),
    "freelance": ("freelance", "freelancer", "self employed", "self-employed"),
}


def employment_type_stated(employment_type: str, raw_text: str) -> bool:
    """True when the resume actually names this employment type."""
    markers = _EMPLOYMENT_TYPE_MARKERS.get((employment_type or "").strip().lower())
    if not markers:
        return False
    low = (raw_text or "").lower()
    return any(marker in low for marker in markers)


# Splits a "skillsUsed"/"technologies" free-text field into individual tokens.
# Handles comma, slash, pipe, semicolon, and " and " separators — the shapes
# the LLM emits for these fields ("Java, Spring / Hibernate | MongoDB").
_SKILL_SPLIT_RE = re.compile(r"\s*(?:,|/|\||;|·|•|\band\b|\+)\s*", re.IGNORECASE)


def harvest_skill_names(experiences, projects) -> list[str]:
    """Derive individual skill names from experience `skillsUsed` and project
    `technologies` fields, in first-seen order, deduped case-insensitively.

    Used to populate `skills[]` when the resume has no standalone Skills
    section but names technologies inside its experience/project blocks —
    deterministic, no extra LLM call. Duty/responsibility phrases and bare
    generics are filtered out via is_probable_non_skill, and absurdly long
    fragments (a whole sentence that slipped into the field) are skipped.
    """
    sources: list[str] = []
    for e in experiences or []:
        if getattr(e, "skillsUsed", ""):
            sources.append(e.skillsUsed)
    for p in projects or []:
        if getattr(p, "technologies", ""):
            sources.append(p.technologies)

    seen: set[str] = set()
    out: list[str] = []
    for blob in sources:
        for raw in _SKILL_SPLIT_RE.split(blob):
            name = raw.strip().strip(".").strip()
            if not name or len(name) > 40 or " " in name and len(name.split()) > 4:
                continue
            key = name.lower()
            if key in seen or is_probable_non_skill(name):
                continue
            seen.add(key)
            out.append(name)
    return out


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
    windows = []
    for anchor in candidates:
        for i, line in enumerate(lines):
            if re.search(rf"\b{re.escape(anchor)}\b", line, re.IGNORECASE):
                lo, hi = max(0, i - 1), min(len(lines), i + 2)
                windows.append("\n".join(lines[lo:hi]))
    if not windows:
        return None
    # The same anchor word can occur in prose (e.g. 'communication skills') far
    # from the education row. Prefer a window that actually names a year, since
    # that is the date-bearing region we want to re-ground against. Among the
    # year-bearing windows pick the one with the FEWEST distinct years: on a
    # "degree / institution / year" block the degree-anchored ±1 window can
    # reach UP into the previous row's year line (borrowing its range), while
    # the institution-anchored window sees only this row's own year. Fewest
    # years == tightest, own-row window. Ties keep anchor order (degree first).
    year_windows = [(w, len(set(_YEAR_RE.findall(w)))) for w in windows if _YEAR_RE.search(w)]
    if year_windows:
        return min(year_windows, key=lambda t: t[1])[0]
    return windows[0]


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
