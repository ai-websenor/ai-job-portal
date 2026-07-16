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

from app.models.resume import ResumeOutput

LogFn = Callable[[str, str], None]

CERT_FUZZY_THRESHOLD = 0.75
COMPANY_FUZZY_THRESHOLD = 0.6


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
            log(f"dropped certification {cert.name!r} (grounding score {score:.2f} < {CERT_FUZZY_THRESHOLD})", "warning")
    output.certifications = kept_certs

    # --- experience: blank companyName with no grounding hit, keep the entry ---
    for exp in output.experienceDetails:
        if exp.companyName:
            score = _grounding_score(exp.companyName, haystack_tokens)
            if score < COMPANY_FUZZY_THRESHOLD:
                log(f"blanked company {exp.companyName!r} for {exp.title!r} (grounding score {score:.2f})", "warning")
                exp.companyName = ""

        if not _year_grounded(exp.startDate, raw_text):
            log(f"nulled startDate {exp.startDate!r} for {exp.title!r}@{exp.companyName!r} (year not found in text)", "warning")
            exp.startDate = None
        if not _year_grounded(exp.endDate, raw_text):
            log(f"nulled endDate {exp.endDate!r} for {exp.title!r}@{exp.companyName!r} (year not found in text)", "warning")
            exp.endDate = None

    # --- education: date grounding ---
    for edu in output.educationalDetails:
        if not _year_grounded(edu.startDate, raw_text):
            log(f"nulled education startDate {edu.startDate!r} for {edu.degree!r} (year not found in text)", "warning")
            edu.startDate = None
        if not _year_grounded(edu.endDate, raw_text):
            log(f"nulled education endDate {edu.endDate!r} for {edu.degree!r} (year not found in text)", "warning")
            edu.endDate = None

    # --- skills: yearsOfExperience kept only if grounded near the skill name ---
    for skill in output.skills:
        if skill.yearsOfExperience is not None and not _skill_years_grounded(skill.skillName, raw_text):
            log(f"nulled yearsOfExperience for skill {skill.skillName!r} (no 'N years' pattern near mention)", "warning")
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
                log(f"name mismatch: LLM={full_name!r} not fully in header block → replacing with header line {candidate!r}", "warning")
                pd.firstName, pd.lastName = new_first, new_last

    return output
