"""Grounding validator — anti-hallucination net, applied post-merge.

Independent of model choice: checks LLM output against the actual source
text and drops/blanks/nulls values that don't verifiably occur there. Catches
what prompt instructions don't (Phase 2 reduces hallucination rate; this
phase catches what slips through).

All drops are logged with a "[grounding]" prefix so QA can audit false drops
(over-aggressive grounding costs coverage, so thresholds are tuned loose).
"""

import re
from typing import Callable, Optional

from app.config import settings
from app.models.resume import ResumeOutput
from app.parser.geo import lookup_state

LogFn = Callable[[str, str], None]

CERT_FUZZY_THRESHOLD = 0.75
COMPANY_FUZZY_THRESHOLD = 0.6
PROJECT_FUZZY_THRESHOLD = 0.6

_EXTENDED_PERSONAL_LABELS = {
    "gender": ("gender", "sex"),
    "dateOfBirth": ("date of birth", "birth date", "dob"),
    "nationality": ("nationality", "citizenship"),
    "maritalStatus": ("marital status", "civil status"),
    "address": ("address",),
    "hobbies": ("hobbies", "interests"),
    "declaration": ("declaration",),
}

_PROJECT_GROUNDED_FIELDS = (
    "description",
    "technologies",
    "url",
    "role",
    "duration",
    "teamSize",
    "responsibilities",
)

_PROJECT_EXPLICIT_FIELD_LABELS = {
    "role": ("role",),
    "duration": ("duration", "timeline"),
    "teamSize": ("team size", "team members"),
}


def _norm(s) -> str:
    if not s:
        return ""
    s = str(s).strip().lower()
    s = re.sub(r"[.\-,]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _tokens(s: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", _norm(s)))


def _grounding_score(value: str, haystack_tokens: set[str]) -> float:
    """Fraction of `value`'s significant (len>=3) tokens present in the
    source-text token set. 1.0 = every meaningful word of the value is
    literally in the resume; 0.0 = none of it is."""
    tokens = [t for t in re.findall(r"[a-z0-9]+", _norm(value)) if len(t) >= 3]
    if not tokens:
        return 0.0
    hits = sum(1 for t in tokens if t in haystack_tokens)
    return hits / len(tokens)


def _value_grounded(value: str, raw_text: str, threshold: float = 0.6) -> bool:
    """Check exact normalized containment, then fall back to token coverage."""
    value_norm = _norm(value)
    if not value_norm:
        return True
    if value_norm in _norm(raw_text):
        return True
    return _grounding_score(value, _tokens(raw_text)) >= threshold


def _label_context(raw_text: str, labels: tuple[str, ...]) -> str:
    """Return labelled lines plus one continuation line for explicit-only fields."""
    lines = raw_text.splitlines()
    context: list[str] = []
    for index, line in enumerate(lines):
        low = line.lower()
        if not any(re.search(rf"\b{re.escape(label)}\b", low) for label in labels):
            continue
        context.append(line)
        if index + 1 < len(lines):
            context.append(lines[index + 1])
    return "\n".join(context)


def _extended_personal_value_grounded(
    field: str,
    value: str,
    raw_text: str,
) -> bool:
    context = _label_context(raw_text, _EXTENDED_PERSONAL_LABELS[field])
    if not context:
        return False
    if field == "dateOfBirth":
        return _year_grounded(value, context)
    return _value_grounded(value, context, threshold=0.6)


def _project_name_grounded(name: str, raw_text: str) -> bool:
    """Require project-name tokens to occur together on one source line."""
    return any(
        _value_grounded(name, line, threshold=PROJECT_FUZZY_THRESHOLD)
        for line in raw_text.splitlines()
        if line.strip()
    )


def _project_field_grounded(field: str, value: str, raw_text: str) -> bool:
    labels = _PROJECT_EXPLICIT_FIELD_LABELS.get(field)
    if labels:
        context = _label_context(raw_text, labels)
        return bool(context) and _value_grounded(value, context)
    return _value_grounded(value, raw_text)


def _year_grounded(date_str: Optional[str], raw_text: str) -> bool:
    """A startDate/endDate year must occur somewhere in the source text —
    as a bare 4-digit year, or a 2-digit year adjacent to a month name."""
    if not date_str or len(date_str) < 4:
        return True  # nothing to check
    year = date_str[:4]
    if not year.isdigit():
        return True
    if year in raw_text:
        return True
    short = year[2:]
    month_re = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)"
    pattern = rf"(?:{month_re}[a-z]*\W{{0,3}}{short}\b|\b{short}\W{{0,3}}{month_re})"
    return bool(re.search(pattern, raw_text, re.IGNORECASE))


def _skill_years_grounded(skill_name: str, raw_text: str) -> bool:
    """yearsOfExperience for a skill is kept only if a 'N+ years' pattern
    occurs near the skill name's first mention, without crossing into a
    neighboring comma/bullet-separated skill's own years mention."""
    if not skill_name:
        return False
    idx = raw_text.lower().find(skill_name.strip().lower())
    if idx == -1:
        return False
    start = max(0, idx - 80)
    end = idx + len(skill_name) + 80
    before = raw_text[start:idx]
    after = raw_text[idx + len(skill_name):end]
    # Stop each side at the nearest list-item boundary so a sibling skill's
    # "N years" on the same comma/bullet line doesn't leak in.
    boundary = re.search(r"[,;\n]", before[::-1])
    if boundary:
        before = before[len(before) - boundary.start():]
    boundary = re.search(r"[,;\n]", after)
    if boundary:
        after = after[: boundary.start()]
    window = before + skill_name + after
    return bool(re.search(r"\d+\+?\s*(?:years?|yrs?)", window, re.IGNORECASE))


def _header_block(raw_text: str, n_lines: int = 15) -> list[str]:
    return raw_text.splitlines()[:n_lines]


def _best_name_line(lines: list[str]) -> str:
    """Pick the most name-shaped line in the header block: 2-4 title-cased
    words, no digits, no '@', not a section header (not ALL CAPS)."""
    best, best_score = "", 0
    for line in lines:
        line = line.strip()
        if not line or "@" in line or any(c.isdigit() for c in line):
            continue
        words = line.split()
        if not (1 <= len(words) <= 4):
            continue
        if line.isupper():
            continue
        title_cased = sum(1 for w in words if w[:1].isupper())
        score = title_cased
        if score > best_score:
            best, best_score = line, score
    return best


def apply_grounding(output: ResumeOutput, raw_text: str, _log: Optional[LogFn] = None) -> ResumeOutput:
    """Post-merge validation pass: drop/blank/null values that don't
    verifiably occur in the source text. Runs after apply_deterministic_overrides."""

    def log(msg: str, level: str = "info") -> None:
        if settings.app_env.lower() in {"production", "prod"}:
            return
        if _log:
            _log(f"[grounding] {msg}", level)

    haystack_tokens = _tokens(raw_text)

    # --- certifications: drop entries with no fuzzy hit in source text ---
    kept_certs = []
    for cert in output.certifications:
        score = _grounding_score(cert.name, haystack_tokens)
        if score >= CERT_FUZZY_THRESHOLD:
            kept_certs.append(cert)
        else:
            log(
                f"dropped ungrounded certification entry "
                f"(score {score:.2f} < {CERT_FUZZY_THRESHOLD})",
                "warning",
            )
    output.certifications = kept_certs

    # --- projects: drop invented entries; blank unsupported optional details ---
    kept_projects = []
    for project in output.projects:
        score = _grounding_score(project.name, haystack_tokens)
        if not project.name or not _project_name_grounded(project.name, raw_text):
            log(
                f"dropped ungrounded project entry "
                f"(score {score:.2f} < {PROJECT_FUZZY_THRESHOLD})",
                "warning",
            )
            continue
        for field in _PROJECT_GROUNDED_FIELDS:
            value = getattr(project, field)
            if value and not _project_field_grounded(field, value, raw_text):
                log(f"cleared ungrounded project field {field}", "warning")
                setattr(project, field, "")
        kept_projects.append(project)
    output.projects = kept_projects

    # --- experience: blank companyName with no grounding hit, keep the entry ---
    for exp in output.experienceDetails:
        if exp.companyName:
            score = _grounding_score(exp.companyName, haystack_tokens)
            if score < COMPANY_FUZZY_THRESHOLD:
                log(f"blanked ungrounded company (score {score:.2f})", "warning")
                exp.companyName = ""

        if not _year_grounded(exp.startDate, raw_text):
            log("nulled ungrounded experience startDate", "warning")
            exp.startDate = None
        if not _year_grounded(exp.endDate, raw_text):
            log("nulled ungrounded experience endDate", "warning")
            exp.endDate = None

    # --- education: date grounding ---
    for edu in output.educationalDetails:
        if not _year_grounded(edu.startDate, raw_text):
            log("nulled ungrounded education startDate", "warning")
            edu.startDate = None
        if not _year_grounded(edu.endDate, raw_text):
            log("nulled ungrounded education endDate", "warning")
            edu.endDate = None

    # --- skills: yearsOfExperience kept only if grounded near the skill name ---
    for skill in output.skills:
        if skill.yearsOfExperience is not None and not _skill_years_grounded(skill.skillName, raw_text):
            log("nulled ungrounded skill yearsOfExperience", "warning")
            skill.yearsOfExperience = None

    # --- name grounding: firstName/lastName tokens must appear in header block ---
    pd = output.personalDetails
    header_lines = _header_block(raw_text)
    header_text_norm = _norm("\n".join(header_lines))
    full_name = f"{pd.firstName} {pd.lastName}".strip()
    if full_name:
        name_tokens = [t for t in _norm(full_name).split() if len(t) >= 2]
        found = sum(1 for t in name_tokens if t in header_text_norm)
        if name_tokens and found < len(name_tokens):
            candidate = _best_name_line(header_lines)
            # Only substitute when the header line still contains the LLM's
            # firstName — fabrication is almost always in the surname, and the
            # firstName anchors us to a real name line rather than accidentally
            # replacing the name with a nearby job-title line.
            first_norm = _norm(pd.firstName)
            cand_tokens = set(_norm(candidate).split()) if candidate else set()
            if candidate and _norm(candidate) != _norm(full_name) and first_norm and first_norm in cand_tokens:
                parts = candidate.split()
                new_first, new_last = parts[0], " ".join(parts[1:])
                log("replaced ungrounded name from resume header", "warning")
                pd.firstName, pd.lastName = new_first, new_last

    # --- location: keep deterministic India derivation only for a grounded city ---
    if pd.city and not _value_grounded(pd.city, raw_text, threshold=0.75):
        log("cleared ungrounded location", "warning")
        pd.city = ""
        pd.state = ""
        pd.country = ""
    elif pd.city:
        inferred_state = lookup_state(pd.city)
        if not inferred_state:
            if pd.state and not _value_grounded(pd.state, raw_text, threshold=0.75):
                log("cleared ungrounded state", "warning")
                pd.state = ""
            if pd.country and not _value_grounded(pd.country, raw_text, threshold=0.75):
                log("cleared ungrounded country", "warning")
                pd.country = ""
    else:
        if pd.state and not _value_grounded(pd.state, raw_text, threshold=0.75):
            log("cleared ungrounded state", "warning")
            pd.state = ""
        if pd.country and not _value_grounded(pd.country, raw_text, threshold=0.75):
            log("cleared ungrounded country", "warning")
            pd.country = ""

    # --- explicit-only extended personal fields ---
    for field in _EXTENDED_PERSONAL_LABELS:
        value = getattr(pd, field)
        if value and not _extended_personal_value_grounded(field, value, raw_text):
            log(f"cleared ungrounded personal field {field}", "warning")
            setattr(pd, field, "")

    return output
