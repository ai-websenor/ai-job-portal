"""Per-section chunked resume processing.

Splits resume into sections, routes each to a focused prompt, calls LLM
per section in parallel, and merges results into a single ResumeOutput.

Output matches the onboarding form schema — flat fields, no confidence scores.
"""

import asyncio
import json
import logging
import re
import time
from typing import Callable, Optional

from app.models.resume import (
    CertificationDetail,
    EducationalDetail,
    ExperienceDetail,
    LanguageDetail,
    PERSONAL_DETAIL_FIELDS,
    PersonalDetails,
    ProjectDetail,
    ResumeOutput,
    SkillDetail,
)
from app.config import settings
from app.parser import contact_extractor, enrich, geo
from app.parser.grounding import apply_grounding
from app.parser.chunk_prompts import build_raw_page_prompt, build_raw_whole_prompt, build_section_prompt
from app.parser.llm import invoke_llm
from app.parser.section_splitter import ResumeSection, split_into_sections

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Section routing — maps splitter output names to chunk types
# ---------------------------------------------------------------------------

SECTION_ROUTING = {
    "header": "personal",
    "personal": "personal",
    "summary": "personal",
    "experience": "experience",
    "education": "education",
    "skills": "skills",
    "certifications": "certifications",
    "projects": "projects",
    "achievements": "achievements",
    "publications": "publications",
    "languages": "languages",
    "hobbies": "hobbies",
    "declaration": "declaration",
}

# ---------------------------------------------------------------------------
# Token allocation per section type — (min, max)
# ---------------------------------------------------------------------------

SECTION_TOKEN_LIMITS = {
    "personal": (2000, 5000),
    "experience": (4000, 12000),
    "education": (1000, 4000),
    "skills": (500, 2000),
    "certifications": (500, 2000),
    "projects": (1500, 8000),
    "achievements": (500, 2000),
    "publications": (500, 2000),
    "languages": (300, 1000),
    "hobbies": (300, 1000),
    "declaration": (200, 500),
}


def _calc_tokens(section_type: str, text_len: int) -> int:
    """Calculate max_tokens for a section based on its type and text length."""
    min_tok, max_tok = SECTION_TOKEN_LIMITS.get(section_type, (500, 3000))
    # Experience needs more output tokens (both experienceDetails[] + projects[])
    divisor = 2 if section_type == "experience" else 3
    return min(max(min_tok, text_len // divisor), max_tok)


# ---------------------------------------------------------------------------
# Grouping — route splitter sections to chunk types
# ---------------------------------------------------------------------------


def group_sections(sections: list[ResumeSection]) -> dict[str, str]:
    """Route each section to its chunk type and concatenate same-type sections."""

    buckets: dict[str, list[str]] = {}

    for section in sections:
        # Handle full_resume fallback — send everything to personal + experience
        if section.name == "full_resume":
            lines = section.text.splitlines()
            buckets.setdefault("personal", []).append(
                f"[FULL_RESUME_HEADER]\n{chr(10).join(lines[:20])}"
            )
            buckets.setdefault("experience", []).append(
                f"[FULL_RESUME]\n{section.text}"
            )
            continue

        # Strip _extra<N> suffix for routing lookup
        base_name = re.sub(r"_extra\d*$", "", section.name.lower())
        chunk_type = SECTION_ROUTING.get(base_name)

        if not chunk_type:
            logger.debug("Unknown section '%s' → skipping", section.name)
            continue

        buckets.setdefault(chunk_type, []).append(
            f"[{section.name.upper()}]\n{section.text}"
        )

    result = {key: "\n\n".join(parts) for key, parts in buckets.items() if parts}

    logger.info(
        "Grouped into %d chunk types: %s",
        len(result),
        {k: f"{len(v)} chars" for k, v in result.items()},
    )
    return result


# ---------------------------------------------------------------------------
# Main async entrypoint
# ---------------------------------------------------------------------------

LogFn = Callable[[str, str], None]
ProgressFn = Callable[[int, int], None]  # (chunks_done, chunks_total)


async def process_chunked(
    resume_text: str,
    log_fn: Optional[LogFn] = None,
    progress_fn: Optional[ProgressFn] = None,
) -> ResumeOutput:
    """Split resume into sections, process each in parallel, merge results."""

    def _log(message: str, level: str = "info") -> None:
        getattr(logger, level, logger.info)(message)
        if log_fn:
            log_fn(message, level)

    _log("Starting per-section chunked processing")

    # Split into sections
    sections = split_into_sections(resume_text)
    section_details = [f"{s.name} ({len(s.text)} chars)" for s in sections]
    _log(f"Split into {len(sections)} sections: {section_details}")

    # Group by chunk type
    chunks = group_sections(sections)
    for ctype, ctext in chunks.items():
        tokens = _calc_tokens(ctype, len(ctext))
        _log(f"Chunk '{ctype}': {len(ctext)} chars → {tokens} max_tokens")

    if not chunks:
        _log("No sections found, returning empty output", "warning")
        return ResumeOutput()

    # Report total chunks to progress
    total_chunks = len(chunks)
    if progress_fn:
        progress_fn(0, total_chunks)

    # Build task list
    tasks: list[tuple[str, str, int]] = []
    for ctype, ctext in chunks.items():
        prompt = build_section_prompt(ctype, ctext)
        max_tokens = _calc_tokens(ctype, len(ctext))
        tasks.append((ctype, prompt, max_tokens))

    # Process all in parallel
    chunks_done = 0

    async def _invoke_chunk(chunk_type: str, prompt: str, max_tokens: int) -> tuple[str, str | None]:
        nonlocal chunks_done
        _log(f"Sending {chunk_type} to LLM ({max_tokens} max_tokens, {len(prompt)} chars prompt)")
        t0 = time.time()
        try:
            raw = await asyncio.to_thread(invoke_llm, prompt, max_tokens, 0.1)
            elapsed = time.time() - t0
            chunks_done += 1
            _log(f"Completed {chunk_type} in {elapsed:.1f}s ({len(raw)} chars) [{chunks_done}/{total_chunks}]")
            # Log raw LLM response for debugging
            _log(f"[{chunk_type}] LLM response: {raw[:500]}{'...' if len(raw) > 500 else ''}")
            if progress_fn:
                progress_fn(chunks_done, total_chunks)
            return chunk_type, raw
        except Exception as e:
            elapsed = time.time() - t0
            chunks_done += 1
            _log(f"Failed {chunk_type} after {elapsed:.1f}s: {e}", "error")
            if progress_fn:
                progress_fn(chunks_done, total_chunks)
            return chunk_type, None

    # Sliding window: max N concurrent LLM calls per parse (prevents GPU overload)
    _per_parse_sem = asyncio.Semaphore(settings.per_parse_concurrency)

    async def _invoke_with_limit(ct, p, mt):
        async with _per_parse_sem:
            return await _invoke_chunk(ct, p, mt)

    _log(f"Processing {len(tasks)} chunks (max {settings.per_parse_concurrency} concurrent)")
    results = await asyncio.gather(
        *[_invoke_with_limit(ct, p, mt) for ct, p, mt in tasks]
    )

    # Build results dict
    raw_results: dict[str, str | None] = {}
    for chunk_type, raw_text in results:
        raw_results[chunk_type] = raw_text

    _log("Merging chunk results")
    output = merge_chunk_results(raw_results, _log)
    output = _finalize_output(output, resume_text, _log)
    _log("Per-section processing complete")

    return output


# ---------------------------------------------------------------------------
# JSON parsing helpers
# ---------------------------------------------------------------------------


def _repair_truncated_json(json_str: str) -> dict | None:
    """Fix truncated JSON by closing unbalanced braces/brackets."""
    search_region = json_str[-1000:] if len(json_str) > 1000 else json_str

    last_close = -1
    for i in range(len(search_region) - 1, -1, -1):
        if search_region[i] in ("}", "]"):
            last_close = i
            break

    if last_close != -1:
        offset = len(json_str) - len(search_region)
        truncated = json_str[: offset + last_close + 1]
    else:
        truncated = json_str.rstrip()

    for _ in range(10):
        open_braces = truncated.count("{") - truncated.count("}")
        open_brackets = truncated.count("[") - truncated.count("]")

        if open_braces <= 0 and open_brackets <= 0:
            return None

        suffix = "]" * max(open_brackets, 0) + "}" * max(open_braces, 0)
        candidate = truncated + suffix

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        trim_pos = -1
        for ch in (",", ":", "{", "[", "}", "]"):
            pos = truncated.rfind(ch)
            if pos > 0 and pos > trim_pos:
                trim_pos = pos

        if trim_pos <= 0:
            break
        truncated = truncated[:trim_pos]

    logger.debug("JSON repair failed after multiple trim attempts")
    return None


def _parse_chunk_json(raw_text: str | None, chunk_type: str) -> dict | None:
    """Extract and parse JSON from raw LLM output."""
    if not raw_text:
        logger.warning("[%s] No raw text to parse", chunk_type)
        return None

    logger.info("[%s] Raw LLM output: %d chars, first 200: %.200s", chunk_type, len(raw_text), raw_text)

    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1

    if start == -1 or end == 0:
        logger.warning("[%s] No JSON found in output (%d chars)", chunk_type, len(cleaned))
        return None

    json_str = cleaned[start:end]
    # Strip JS-style comments the LLM sometimes emits (invalid in strict JSON).
    # Line comments only outside string literals: `//...` through end-of-line.
    # Also handle `/* ... */` block comments.
    json_str_sanitized = _strip_js_comments(json_str)
    # Remove trailing commas before } or ] — another common LLM deviation.
    json_str_sanitized = re.sub(r",(\s*[\}\]])", r"\1", json_str_sanitized)
    logger.info("[%s] Extracted JSON: %d chars (sanitized %d)", chunk_type, len(json_str), len(json_str_sanitized))

    try:
        data = json.loads(json_str_sanitized)
        logger.info("[%s] JSON parsed OK, keys: %s", chunk_type, list(data.keys()) if isinstance(data, dict) else type(data).__name__)
        return data
    except json.JSONDecodeError as e:
        logger.warning("[%s] JSON parse failed at pos %d: %s", chunk_type, e.pos, e.msg)
        repaired = _repair_truncated_json(json_str_sanitized)
        if repaired is not None:
            logger.info("[%s] JSON repair succeeded", chunk_type)
            return repaired
        logger.error("[%s] JSON repair also failed", chunk_type)
        return None


def _strip_js_comments(s: str) -> str:
    """Remove //... line comments and /* ... */ block comments outside of JSON string literals."""
    out: list[str] = []
    i = 0
    n = len(s)
    in_string = False
    string_quote = ""
    while i < n:
        ch = s[i]
        if in_string:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(s[i + 1])
                i += 2
                continue
            if ch == string_quote:
                in_string = False
            i += 1
            continue
        # Not in string
        if ch == '"' or ch == "'":
            in_string = True
            string_quote = ch
            out.append(ch)
            i += 1
            continue
        # Line comment
        if ch == "/" and i + 1 < n and s[i + 1] == "/":
            # skip to end of line
            nl = s.find("\n", i + 2)
            i = n if nl == -1 else nl
            continue
        # Block comment
        if ch == "/" and i + 1 < n and s[i + 1] == "*":
            end_blk = s.find("*/", i + 2)
            i = n if end_blk == -1 else end_blk + 2
            continue
        out.append(ch)
        i += 1
    return "".join(out)


# ---------------------------------------------------------------------------
# Safe per-item parsers (flat fields, no confidence wrappers)
# ---------------------------------------------------------------------------


def _fix_list_value(val):
    """Convert list values to joined strings. LLM sometimes returns lists instead of strings."""
    import ast
    if isinstance(val, list):
        return "; ".join(str(item).lstrip("- ").strip() for item in val if item)
    if isinstance(val, str) and val.startswith("[") and val.endswith("]"):
        for parser in (json.loads, ast.literal_eval):
            try:
                items = parser(val)
                if isinstance(items, list):
                    return "; ".join(str(item).lstrip("- ").strip() for item in items if item)
            except (json.JSONDecodeError, ValueError, SyntaxError):
                continue
    return val


_PLACEHOLDER_STRINGS = {
    "n/a", "na", "not specified", "not available", "not mentioned",
    "not provided", "none", "unknown", "nil", "null", "-", "--",
}


def _is_placeholder(val: str) -> bool:
    """Check if a string is an LLM placeholder that should be empty."""
    return val.strip().lower() in _PLACEHOLDER_STRINGS


def _fix_linkedin_url(url: str) -> str:
    """Ensure LinkedIn URL has https:// prefix."""
    if not url:
        return url
    url = url.strip()
    if "linkedin.com" in url and not url.startswith("http"):
        return f"https://{url}"
    # Incomplete URLs like "https://linkedin.com" (no path)
    if url == "https://linkedin.com" or url == "https://www.linkedin.com":
        return ""
    return url


def _fix_github_url(url: str) -> str:
    """Ensure GitHub URL has https:// prefix."""
    if not url:
        return url
    url = url.strip()
    if "github.com" in url and not url.startswith("http"):
        return f"https://{url}"
    if url == "https://github.com" or url == "https://www.github.com":
        return ""
    return url


def _fix_date_value(val: str | None) -> str | None:
    """Fix literal YYYY placeholders in dates. Return None if invalid."""
    if val is None:
        return None
    val = val.strip()
    if _is_placeholder(val):
        return None
    # Literal "YYYY-01-01" or "YYYY-MM-DD" — LLM didn't substitute
    if val.startswith("YYYY"):
        return None
    return val


def _coerce_flat_fields(data: dict, model_cls) -> dict:
    """Coerce LLM output to match model field types.

    - null / placeholder strings → "" for str fields
    - list → semicolon-joined string for str fields
    - null → False for bool fields
    - Fix URLs, dates, and enforce defaults
    """
    if not isinstance(data, dict):
        return data

    coerced = {}
    for key, val in data.items():
        field_info = model_cls.model_fields.get(key)
        if not field_info:
            coerced[key] = val
            continue

        annotation = field_info.annotation

        # Handle Optional[str] → str | None
        is_optional_str = False
        if hasattr(annotation, "__origin__"):
            import typing
            args = getattr(annotation, "__args__", ())
            if annotation is Optional[str] or (args and str in args and type(None) in args):
                is_optional_str = True

        if annotation is str:
            # Required str: null/placeholder → ""
            if val is None:
                coerced[key] = ""
            elif isinstance(val, list):
                coerced[key] = _fix_list_value(val)
            elif isinstance(val, dict):
                coerced[key] = str(val.get("value", "")) if val.get("value") else ""
            else:
                s = str(val)
                coerced[key] = "" if _is_placeholder(s) else s
        elif is_optional_str:
            # Optional[str] — dates: fix YYYY placeholders, strip placeholders
            if isinstance(val, list):
                coerced[key] = _fix_list_value(val)
            elif isinstance(val, dict):
                coerced[key] = str(val.get("value", "")) if val.get("value") else None
            elif isinstance(val, str):
                coerced[key] = _fix_date_value(val)
            else:
                coerced[key] = val
        elif annotation is bool:
            coerced[key] = bool(val) if val is not None else False
        else:
            coerced[key] = val

    # --- Field-specific post-fixes ---

    # proficiencyLevel / employmentType: leave empty when the resume doesn't state it.
    # (No forced "intermediate" / "full_time" filler — those were fabricating data.)
    if "proficiencyLevel" in coerced and _is_placeholder(coerced["proficiencyLevel"] or ""):
        coerced["proficiencyLevel"] = ""
    if "employmentType" in coerced and _is_placeholder(coerced["employmentType"] or ""):
        coerced["employmentType"] = ""

    # designation: copy from title if empty
    if "designation" in coerced and "title" in coerced:
        if not coerced["designation"] or _is_placeholder(coerced.get("designation", "")):
            coerced["designation"] = coerced["title"]

    # LinkedIn URL fix
    if "linkedin" in coerced:
        coerced["linkedin"] = _fix_linkedin_url(coerced["linkedin"])

    # GitHub URL fix
    if "github" in coerced:
        coerced["github"] = _fix_github_url(coerced["github"])

    # Generic URL fields: ensure https:// prefix if contains known domains
    if "url" in coerced and coerced["url"]:
        url = coerced["url"].strip()
        if url and not url.startswith("http") and ("github.com" in url or "gitlab.com" in url or "." in url):
            coerced["url"] = f"https://{url}"

    # website must never hold a LinkedIn/GitHub URL or an email address —
    # the LLM sometimes duplicates them there (report bug #4, #7).
    if "website" in coerced and coerced["website"] and contact_extractor.is_non_website_url(coerced["website"]):
        coerced["website"] = ""

    return coerced


def _safe_parse(model_cls, item, label="item"):
    """Parse a single item into a Pydantic model, return None on failure."""
    try:
        if not isinstance(item, dict):
            return None
        coerced = _coerce_flat_fields(item, model_cls)
        return model_cls(**coerced)
    except Exception as e:
        logger.debug("Skipping invalid %s: %s → %s", label, e, item)
        return None


def _parse_list(model_cls, data: list, label: str) -> list:
    """Parse a list of items into model instances, skipping failures."""
    results = []
    for item in data:
        parsed = _safe_parse(model_cls, item, label)
        if parsed:
            results.append(parsed)
    return results


def _filter_empty_languages(langs: list[LanguageDetail]) -> list[LanguageDetail]:
    """Remove language entries where name is empty."""
    return [lang for lang in langs if lang.name and not _is_placeholder(lang.name)]


def _deduplicate_experiences(exps: list[ExperienceDetail]) -> list[ExperienceDetail]:
    """Remove duplicate experience entries based on title+company+startDate."""
    seen = set()
    unique = []
    for exp in exps:
        key = (exp.title.lower().strip(), exp.companyName.lower().strip(), exp.startDate)
        if key not in seen:
            seen.add(key)
            unique.append(exp)
    return unique


# ---------------------------------------------------------------------------
# Merge — each chunk type maps to ResumeOutput fields
# ---------------------------------------------------------------------------


def merge_chunk_results(raw_results: dict[str, str | None], _log=None) -> ResumeOutput:
    """Parse each chunk's raw LLM output and merge into a single ResumeOutput."""
    def log(msg, level="info"):
        getattr(logger, level, logger.info)(msg)
        if _log:
            _log(msg, level)

    output = ResumeOutput()

    # --- personal → personalDetails + languages ---
    personal_raw = _parse_chunk_json(raw_results.get("personal"), "personal")
    if personal_raw:
        log(f"[merge] Personal chunk keys: {list(personal_raw.keys())}")
        # LLM returns {"personalDetails": {...}, "languages": [...]}
        personal_dict = personal_raw.get("personalDetails", personal_raw)
        if isinstance(personal_dict, dict):
            personal_keys = set(PERSONAL_DETAIL_FIELDS)
            if personal_keys & set(personal_dict.keys()):
                try:
                    coerced = _coerce_flat_fields(personal_dict, PersonalDetails)
                    output.personalDetails = PersonalDetails(**coerced)
                    log(f"[merge] Personal: name={output.personalDetails.firstName} {output.personalDetails.lastName}, phone={output.personalDetails.phone}, city={output.personalDetails.city}")
                except Exception as e:
                    log(f"[merge] Failed to parse PersonalDetails: {e}", "warning")
            else:
                log(f"[merge] Personal data has unexpected keys: {list(personal_dict.keys())}", "warning")

        # Extract languages from personal chunk
        lang_data = personal_raw.get("languages")
        if isinstance(lang_data, list) and lang_data and not raw_results.get("languages"):
            parsed_langs = _filter_empty_languages(_parse_list(LanguageDetail, lang_data, "language"))
            if parsed_langs:
                output.languages = parsed_langs
                log(f"[merge] Languages (from personal): {len(output.languages)} entries")
            else:
                # LLM may return simple strings like ["English", "Hindi"]
                for item in lang_data:
                    if isinstance(item, str):
                        output.languages.append(LanguageDetail(name=item, proficiency=""))
                if output.languages:
                    log(f"[merge] Languages (from personal, string fallback): {len(output.languages)} entries")
    else:
        log("[merge] Personal chunk returned no parseable data", "warning")

    # --- experience → experienceDetails + projects ---
    exp_data = _parse_chunk_json(raw_results.get("experience"), "experience")
    if exp_data:
        exp_list = exp_data.get("experienceDetails", exp_data.get("experience", []))
        if isinstance(exp_list, list):
            output.experienceDetails = _deduplicate_experiences(
                _parse_list(ExperienceDetail, exp_list, "experience")
            )
            log(f"[merge] Experience: {len(output.experienceDetails)} entries")
            for i, exp in enumerate(output.experienceDetails):
                desc_preview = ("; ".join(exp.description))[:80]
                log(f"[merge]   [{i}] {exp.title} @ {exp.companyName} | {desc_preview}...")

        # Extract projects from experience chunk (embedded projects)
        proj_list = exp_data.get("projects", [])
        if isinstance(proj_list, list) and proj_list and not raw_results.get("projects"):
            output.projects = _parse_list(ProjectDetail, proj_list, "project")
            log(f"[merge] Projects (from experience): {len(output.projects)} entries")
    else:
        log("[merge] Experience chunk returned no data", "warning")

    # --- education → educationalDetails ---
    data = _parse_chunk_json(raw_results.get("education"), "education")
    if data:
        edu_list = data.get("educationalDetails", data.get("education", []))
        if isinstance(edu_list, list):
            output.educationalDetails = _parse_list(EducationalDetail, edu_list, "education")
            log(f"[merge] Education: {len(output.educationalDetails)} entries")

    # --- skills ---
    skills_data = _parse_chunk_json(raw_results.get("skills"), "skills")
    if skills_data:
        skill_list = skills_data.get("skills", [])
        if isinstance(skill_list, list):
            output.skills = _parse_list(SkillDetail, skill_list, "skill")
            skill_names = [s.skillName for s in output.skills[:10]]
            log(f"[merge] Skills: {len(output.skills)} entries — {skill_names}{'...' if len(output.skills) > 10 else ''}")

        # Extract spoken languages from skills chunk
        if not output.languages and "languages" in skills_data and isinstance(skills_data["languages"], list):
            langs = _filter_empty_languages(_parse_list(LanguageDetail, skills_data["languages"], "language"))
            if langs:
                output.languages = langs
                log(f"[merge] Languages (from skills): {len(output.languages)} entries")

    # --- certifications ---
    data = _parse_chunk_json(raw_results.get("certifications"), "certifications")
    if data and "certifications" in data and isinstance(data["certifications"], list):
        output.certifications = _parse_list(CertificationDetail, data["certifications"], "certification")
        log(f"[merge] Certifications: {len(output.certifications)} entries")

    # --- projects ---
    data = _parse_chunk_json(raw_results.get("projects"), "projects")
    if data and "projects" in data and isinstance(data["projects"], list):
        output.projects = _parse_list(ProjectDetail, data["projects"], "project")
        log(f"[merge] Projects: {len(output.projects)} entries")

    # --- languages ---
    data = _parse_chunk_json(raw_results.get("languages"), "languages")
    if data and "languages" in data and isinstance(data["languages"], list):
        output.languages = _filter_empty_languages(_parse_list(LanguageDetail, data["languages"], "language"))
        log(f"[merge] Languages: {len(output.languages)} entries")

    # --- achievements, publications, hobbies, declaration ---
    # Not in onboarding form schema — skip silently

    log(f"Merge complete: name={output.personalDetails.firstName} {output.personalDetails.lastName}, "
        f"{len(output.experienceDetails)} exp, {len(output.educationalDetails)} edu, "
        f"{len(output.skills)} skills, {len(output.languages)} lang")

    return output


# ---------------------------------------------------------------------------
# Raw mode — 1 page = 1 LLM call returning full ResumeOutput schema
# ---------------------------------------------------------------------------

_PROFICIENCY_RANK = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}


def _dedup_educations(items: list[EducationalDetail]) -> list[EducationalDetail]:
    seen: dict[tuple, EducationalDetail] = {}
    for it in items:
        key = (
            (it.institution or "").lower().strip(),
            (it.degree or "").lower().strip(),
            it.startDate,
        )
        if key not in seen:
            seen[key] = it
    return list(seen.values())


def _dedup_skills(items: list[SkillDetail]) -> list[SkillDetail]:
    seen: dict[str, SkillDetail] = {}
    for it in items:
        name = (it.skillName or "").lower().strip()
        if not name:
            continue
        existing = seen.get(name)
        if not existing:
            seen[name] = it
            continue
        # prefer higher proficiency; fall back to the one with years set
        new_rank = _PROFICIENCY_RANK.get((it.proficiencyLevel or "").lower(), 0)
        old_rank = _PROFICIENCY_RANK.get((existing.proficiencyLevel or "").lower(), 0)
        if new_rank > old_rank or (
            new_rank == old_rank and it.yearsOfExperience and not existing.yearsOfExperience
        ):
            seen[name] = it
    return list(seen.values())


def _merge_experience_pair(a: ExperienceDetail, b: ExperienceDetail) -> ExperienceDetail:
    """Merge two experience entries sharing the same natural key (e.g. split across pages)."""
    def pick(x: str, y: str) -> str:
        if x and not _is_placeholder(x):
            return x
        return y or ""

    def pick_bool(x: bool, y: bool) -> bool:
        return x or y

    def pick_date(x, y):
        return x or y

    def join_desc(x: str, y: str) -> str:
        parts = [p.strip() for p in (x, y) if p and p.strip() and not _is_placeholder(p)]
        # De-dup obviously identical segments
        if len(parts) == 2 and parts[0] == parts[1]:
            return parts[0]
        return "; ".join(parts)

    def merge_bullets(x: list[str], y: list[str]) -> list[str]:
        """Concatenate two bullet lists, dropping case-insensitive duplicates
        while preserving order (split entries across pages get stitched)."""
        out: list[str] = []
        seen: set[str] = set()
        for item in (x or []) + (y or []):
            k = item.strip().lower()
            if k and k not in seen:
                seen.add(k)
                out.append(item.strip())
        return out

    return ExperienceDetail(
        title=pick(a.title, b.title),
        designation=pick(a.designation, b.designation),
        companyName=pick(a.companyName, b.companyName),
        employmentType=pick(a.employmentType, b.employmentType),
        location=pick(a.location, b.location),
        startDate=pick_date(a.startDate, b.startDate),
        endDate=pick_date(a.endDate, b.endDate),
        isCurrent=pick_bool(a.isCurrent, b.isCurrent),
        description=merge_bullets(a.description, b.description),
        achievements=join_desc(a.achievements, b.achievements),
        skillsUsed=pick(a.skillsUsed, b.skillsUsed),
    )


def _dedup_experiences_merging(items: list[ExperienceDetail]) -> list[ExperienceDetail]:
    """Dedup by (title, company, startDate). When same key appears again, merge into the first."""
    seen: dict[tuple, ExperienceDetail] = {}
    order: list[tuple] = []
    for it in items:
        key = (
            (it.title or "").lower().strip(),
            (it.companyName or "").lower().strip(),
            it.startDate,
        )
        if key not in seen:
            seen[key] = it
            order.append(key)
        else:
            seen[key] = _merge_experience_pair(seen[key], it)
    return [seen[k] for k in order]


def _dedup_certifications(items: list[CertificationDetail]) -> list[CertificationDetail]:
    seen: dict[tuple, CertificationDetail] = {}
    for it in items:
        key = ((it.name or "").lower().strip(), (it.issuingOrganization or "").lower().strip())
        if not key[0]:
            continue
        if key not in seen:
            seen[key] = it
    return list(seen.values())


def _dedup_projects(items: list[ProjectDetail]) -> list[ProjectDetail]:
    seen: dict[str, ProjectDetail] = {}
    order: list[str] = []
    for it in items:
        name = (it.name or "").lower().strip()
        if not name:
            continue
        if name not in seen:
            seen[name] = it
            order.append(name)
            continue
        # Same name on another page → merge descriptions / technologies
        old = seen[name]
        merged_desc = old.description
        if it.description and it.description not in merged_desc:
            merged_desc = f"{merged_desc}; {it.description}".strip("; ") if merged_desc else it.description
        merged_tech = old.technologies or it.technologies or ""
        merged_resp = old.responsibilities
        if it.responsibilities and it.responsibilities not in merged_resp:
            merged_resp = f"{merged_resp}; {it.responsibilities}".strip("; ") if merged_resp else it.responsibilities
        seen[name] = ProjectDetail(
            name=old.name or it.name,
            description=merged_desc,
            technologies=merged_tech,
            url=old.url or it.url or "",
            role=old.role or it.role or "",
            duration=old.duration or it.duration or "",
            teamSize=old.teamSize or it.teamSize or "",
            responsibilities=merged_resp,
        )
    return [seen[k] for k in order]


def _dedup_languages(items: list[LanguageDetail]) -> list[LanguageDetail]:
    seen: dict[str, LanguageDetail] = {}
    for it in items:
        name = (it.name or "").lower().strip()
        if not name or _is_placeholder(name):
            continue
        existing = seen.get(name)
        if not existing:
            seen[name] = it
        elif not existing.proficiency and it.proficiency:
            seen[name] = it
    return list(seen.values())


def _merge_personal(acc: PersonalDetails, new: PersonalDetails) -> PersonalDetails:
    """First-non-empty-wins merge across pages."""
    def pick(a: str, b: str) -> str:
        return a if (a and not _is_placeholder(a)) else (b or "")

    return PersonalDetails(**{
        field: pick(getattr(acc, field), getattr(new, field))
        for field in PERSONAL_DETAIL_FIELDS
    })


def _extract_personal(page_data: dict) -> PersonalDetails | None:
    pd = page_data.get("personalDetails")
    if not isinstance(pd, dict):
        return None
    coerced = _coerce_flat_fields(pd, PersonalDetails)
    try:
        return PersonalDetails(**coerced)
    except Exception as e:
        logger.debug("PersonalDetails parse failed: %s", e)
        return None


def _project_has_content(p: ProjectDetail) -> bool:
    """True when a project carries real data beyond its name — description, tech,
    responsibilities, role, url, duration, or team size. A name-only entry is a
    mis-captured section header (e.g. 'PERSONAL PROJECTS')."""
    return any(
        (getattr(p, f, "") or "").strip()
        for f in ("description", "technologies", "responsibilities", "role", "url", "duration", "teamSize")
    )


def _dedup_projects_against_experience(
    projects: list[ProjectDetail], experiences: list[ExperienceDetail]
) -> list[ProjectDetail]:
    """Drop a project entry if its name matches an experience *title* (the LLM
    sometimes emits the same job in both sections). Company name is deliberately
    NOT matched — a legitimate project is often named after the client/employer
    it was built for, and dropping those loses real data."""
    exp_titles = {(e.title or "").lower().strip() for e in experiences if e.title}
    exp_titles.discard("")
    return [p for p in projects if (p.name or "").lower().strip() not in exp_titles]


def _norm_compare(s: str) -> str:
    """Punctuation-insensitive comparison key for equality checks between two
    LLM-emitted strings."""
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def _norm_profile_url(u: str) -> str:
    """Canonicalize a profile URL for equivalence checks: drop scheme, www,
    and trailing slash, lowercase. 'https://www.linkedin.com/in/foo/' and
    'linkedin.com/in/foo' compare equal."""
    u = (u or "").strip().lower().rstrip("/")
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    return u


def apply_deterministic_overrides(output: ResumeOutput, raw_text: str, _log=None) -> ResumeOutput:
    """Post-merge pass: prefer regex-extracted contact fields over LLM output,
    fill state via the India city→state lookup, and drop project/experience
    duplicates. Regex wins on conflict for email/phone/linkedin/github because
    the LLM is unreliable on these (drops them, invents them, or misfiles
    them into the wrong field) while regex is near-100% reliable.
    """
    def log(msg, level="info"):
        if settings.app_env.lower() in {"production", "prod"}:
            return
        getattr(logger, level, logger.info)(msg)
        if _log:
            _log(msg, level)

    pd = output.personalDetails

    # A single `if` covers both fill-when-empty and override-on-conflict: when
    # the LLM value is empty the normalized comparison against a non-empty regex
    # value is always unequal, so the earlier `elif not pd.x` branches were dead.
    reg_email = contact_extractor.extract_primary_email(raw_text)
    if reg_email and reg_email.lower() != (pd.email or "").lower():
        if pd.email:
            log("[deterministic] replaced email with grounded source value")
        pd.email = reg_email

    # Compare profile URLs normalized (scheme / www / trailing slash stripped)
    # so cosmetic-only differences don't needlessly overwrite a correct LLM value.
    reg_linkedin = contact_extractor.extract_linkedin(raw_text)
    if reg_linkedin and _norm_profile_url(reg_linkedin) != _norm_profile_url(pd.linkedin):
        if pd.linkedin:
            log("[deterministic] replaced LinkedIn with grounded source value")
        pd.linkedin = reg_linkedin

    reg_github = contact_extractor.extract_github(raw_text)
    if reg_github and _norm_profile_url(reg_github) != _norm_profile_url(pd.github):
        if pd.github:
            log("[deterministic] replaced GitHub with grounded source value")
        pd.github = reg_github

    reg_phone = contact_extractor.extract_phone(raw_text)
    if reg_phone:
        reg_digits = re.sub(r"\D", "", reg_phone)
        llm_digits = re.sub(r"\D", "", pd.phone or "")
        if reg_digits != llm_digits:
            if pd.phone:
                log("[deterministic] replaced phone with grounded source value")
            pd.phone = reg_phone

    # Canonicalize phone to a single, consistent '+CC NNNNNNNNNN' shape so the
    # output format never varies between resumes. Keep the pre-normalized value:
    # normalize_phone assumes +91 for bare numbers (market default), which is
    # fine for display but must NOT be trusted for country inference below.
    orig_phone = pd.phone
    if pd.phone:
        normalized = enrich.normalize_phone(pd.phone)
        if normalized != pd.phone:
            log(f"[deterministic] phone normalized {pd.phone!r} → {normalized!r}")
        pd.phone = normalized

    # website must never hold linkedin/github/email — belt-and-braces beyond
    # the per-field coercion fix, in case the LLM used a different key path.
    if pd.website and contact_extractor.is_non_website_url(pd.website):
        log("[deterministic] cleared website containing non-website contact data")
        pd.website = ""

    # Address: the LLM often skips a labelled address block. Pull it straight
    # from the source when missing.
    if not pd.address:
        addr = enrich.extract_address(raw_text)
        if addr:
            pd.address = addr
            log(f"[deterministic] address extracted from text → {addr!r}")

    # City/state: fill from a known city named in the address (or, failing that,
    # the header region) before the geo state-from-city step runs.
    if not pd.city:
        search = pd.address or "\n".join(raw_text.splitlines()[:12])
        city, state = enrich.city_state_from_text(search)
        # Fall back to the contact block (around a phone/email/location anchor)
        # when the top-of-page header names no known city.
        if not city:
            city, state = enrich.city_state_near_contact(raw_text)
        if city:
            pd.city = city
            if not pd.state:
                pd.state = state
            log(f"[deterministic] city/state inferred from address → {city!r}, {state!r}")

    # A grounded Indian city corrects state/country even when already filled.
    # The city→state table only covers well-known cities, so fall back to the
    # state printed beside the city — usually a two-letter code ("Nizamabad, TS.")
    # that the LLM expands correctly but with no literal support in the text.
    if pd.city:
        inferred_state = geo.lookup_state(pd.city) or enrich.state_beside_city(raw_text, pd.city)
        if inferred_state:
            if pd.state.strip().lower() != inferred_state.lower():
                log("[deterministic] corrected state from grounded Indian city")
            pd.state = inferred_state
            if pd.country.strip().lower() != "india":
                log("[deterministic] corrected country from grounded Indian city")
                pd.country = "India"

    # Country: from an EXPLICIT phone country code only (never from the assumed
    # +91 added to bare numbers — a bare US number must not become India). The
    # grounded-city block above already covers India-from-city.
    if not pd.country:
        country = enrich.country_from_phone(orig_phone) if orig_phone.strip().startswith("+") else ""
        if country:
            pd.country = country
            log(f"[deterministic] country inferred → {country!r}")

    # Nationality: derive the demonym from a known country ('India' → 'Indian').
    if not pd.nationality and pd.country:
        nat = enrich.nationality_for_country(pd.country)
        if nat:
            pd.nationality = nat
            log(f"[deterministic] nationality inferred from country {pd.country!r} → {nat!r}")

    # Gender is intentionally NOT inferred — kept only when the resume states it
    # explicitly (via the LLM). No name- or photo-based guessing.

    # headline: drop it when it's really just the first line of the summary
    # (the LLM's most common headline fabrication). Checked BEFORE summary
    # cleanup, since stripping the summary's leading label would otherwise
    # de-align the shared prefix and hide the match.
    if pd.headline and enrich.headline_is_fabricated(pd.headline, pd.professionalSummary):
        log(f"[deterministic] cleared fabricated headline {pd.headline!r} (matches summary)")
        pd.headline = ""

    # headline: a headline is ONE role title lifted verbatim from the header, not
    # a stitched-together career history ("Associate Software Engineer | Senior
    # Associate | Senior Software Engineer"). When the LLM's value isn't printed
    # on a single source line, recover the real title line from the header block.
    if not pd.headline or not enrich.headline_on_single_source_line(pd.headline, raw_text):
        recovered = enrich.headline_from_header(raw_text, pd.firstName, pd.lastName)
        if recovered and recovered.strip().lower() != (pd.headline or "").strip().lower():
            log(f"[deterministic] headline recovered from header {pd.headline!r} → {recovered!r}")
            pd.headline = recovered

    # professionalSummary: strip embedded newlines and any leading section label.
    if pd.professionalSummary:
        cleaned = enrich.clean_summary(pd.professionalSummary)
        if cleaned != pd.professionalSummary:
            pd.professionalSummary = cleaned

    # Normalize loose date strings the LLM left un-parsed (e.g. 'March-2001',
    # 'Oct 11/2019') to YYYY-MM-DD.
    for exp in output.experienceDetails:
        exp.startDate = enrich.normalize_date(exp.startDate)
        # A "Present"/"Till date" endDate marks a live role — set isCurrent and
        # clear the field (schema wants a date or null, never a stray word).
        if exp.endDate and enrich.is_current_marker(exp.endDate):
            exp.isCurrent = True
        exp.endDate = enrich.normalize_date(exp.endDate)
    for edu in output.educationalDetails:
        edu.startDate = enrich.normalize_date(edu.startDate)
        edu.endDate = enrich.normalize_date(edu.endDate)

    # Correct LLM-invented education date ranges against the source text (e.g.
    # a 'YEAR Degree' row where the single year is the passing year, not a span).
    enrich.reground_education_dates(output.educationalDetails, raw_text, log)

    # Grades must reach the onboarding form as a plain number plus a gradeType of
    # 'cgpa' or 'percentage' — anything else ('Passed out in 2007', 'First Class')
    # fails the form's numeric validation, so it is dropped rather than shipped.
    enrich.normalize_education_grades(output.educationalDetails, raw_text, log)

    # A live role stated only in the present tense ("Working as X in Y") gives the
    # LLM no end date to reason from, so isCurrent comes back false.
    enrich.mark_current_from_present_tense(output.experienceDetails, raw_text, log)

    # A certification's issuer echoed back as its own name is not an issuer — the
    # resume simply never named one.
    for cert in output.certifications:
        if cert.issuingOrganization and _norm_compare(cert.issuingOrganization) == _norm_compare(cert.name):
            log(f"[deterministic] cleared issuer echoing certification name {cert.name!r}")
            cert.issuingOrganization = ""

    # Strip responsibility prose out of tech-stack fields before they are read as
    # skills below — the LLM often copies the neighbouring bullet into them.
    for project in output.projects:
        cleaned = enrich.clean_tech_list(project.technologies)
        if cleaned != project.technologies:
            log(f"[deterministic] cleaned project technologies for {project.name!r}")
            project.technologies = cleaned
    for exp in output.experienceDetails:
        cleaned = enrich.clean_tech_list(exp.skillsUsed)
        if cleaned != exp.skillsUsed:
            log(f"[deterministic] cleaned skillsUsed for {exp.companyName or exp.title!r}")
            exp.skillsUsed = cleaned

    # Drop responsibility/duty phrases the LLM misfiled as skills.
    output.skills = enrich.filter_skills(output.skills, log)

    # No standalone Skills section → harvest named technologies from the
    # experience/project blocks so the field isn't left empty when the resume
    # clearly lists tools inside its work history. Deterministic, no LLM call.
    if not output.skills:
        harvested = enrich.harvest_skill_names(output.experienceDetails, output.projects)
        if harvested:
            output.skills = [SkillDetail(skillName=n) for n in harvested]
            log(f"[deterministic] harvested {len(harvested)} skill(s) from experience/projects")

    before = len(output.projects)
    output.projects = _dedup_projects_against_experience(output.projects, output.experienceDetails)
    if len(output.projects) != before:
        log(f"[deterministic] dropped {before - len(output.projects)} project(s) duplicated in experience")

    # Drop content-less projects: a bare section header like "PERSONAL PROJECTS"
    # with no description/tech/responsibilities is a fabricated entry, not a real
    # project. Keep any project that carries at least one payload field.
    before = len(output.projects)
    output.projects = [p for p in output.projects if _project_has_content(p)]
    if len(output.projects) != before:
        log(f"[deterministic] dropped {before - len(output.projects)} empty project(s)")

    return output


def _finalize_output(output: ResumeOutput, raw_text: str, _log=None) -> ResumeOutput:
    """Apply every deterministic and grounding validator in a fixed order."""
    output = apply_deterministic_overrides(output, raw_text, _log)
    return apply_grounding(output, raw_text, _log)


def merge_page_results(per_page_data: list[dict | None], _log=None) -> ResumeOutput:
    """Merge N per-page full-schema JSON outputs into a single ResumeOutput.

    Field rules:
    - personalDetails: first-non-empty per sub-field (usually page 1)
    - experienceDetails: concat + dedup by (title, company, startDate) with cross-page
      merge of description/achievements for split entries
    - educationalDetails: concat + dedup by (institution, degree, startDate)
    - skills: concat + dedup by skillName, preferring highest proficiency
    - certifications: concat + dedup by (name, issuer)
    - projects: concat + dedup by name, merging descriptions for the same project
    - languages: concat + dedup by name, preferring entries with proficiency
    """

    def log(msg, level="info"):
        getattr(logger, level, logger.info)(msg)
        if _log:
            _log(msg, level)

    output = ResumeOutput()

    all_edu: list[EducationalDetail] = []
    all_skills: list[SkillDetail] = []
    all_exp: list[ExperienceDetail] = []
    all_certs: list[CertificationDetail] = []
    all_projects: list[ProjectDetail] = []
    all_langs: list[LanguageDetail] = []

    for i, page in enumerate(per_page_data):
        if not isinstance(page, dict):
            log(f"[merge_raw] page {i + 1}: no parseable data", "warning")
            continue

        pd = _extract_personal(page)
        if pd:
            output.personalDetails = _merge_personal(output.personalDetails, pd)

        for key, acc, model_cls, label in (
            ("educationalDetails", all_edu, EducationalDetail, "education"),
            ("skills", all_skills, SkillDetail, "skill"),
            ("experienceDetails", all_exp, ExperienceDetail, "experience"),
            ("certifications", all_certs, CertificationDetail, "certification"),
            ("projects", all_projects, ProjectDetail, "project"),
            ("languages", all_langs, LanguageDetail, "language"),
        ):
            raw_list = page.get(key)
            if isinstance(raw_list, list) and raw_list:
                acc.extend(_parse_list(model_cls, raw_list, label))

        log(
            f"[merge_raw] page {i + 1}: +{len(page.get('educationalDetails') or [])} edu, "
            f"+{len(page.get('skills') or [])} skills, "
            f"+{len(page.get('experienceDetails') or [])} exp, "
            f"+{len(page.get('projects') or [])} proj, "
            f"+{len(page.get('certifications') or [])} cert, "
            f"+{len(page.get('languages') or [])} lang"
        )

    output.educationalDetails = _dedup_educations(all_edu)
    output.skills = _dedup_skills(all_skills)
    output.certifications = _dedup_certifications(all_certs)
    output.languages = _filter_empty_languages(_dedup_languages(all_langs))

    # Reclassify: experience entries without a real company AND without a start date
    # are almost always mis-classified projects. LLM sees them in isolation (the
    # PROJECTS header lives in an earlier chunk) and defaults to experienceDetails.
    merged_exp = _dedup_experiences_merging(all_exp)
    real_exp: list[ExperienceDetail] = []
    demoted: list[ProjectDetail] = []
    for e in merged_exp:
        has_company = bool((e.companyName or "").strip()) and not _is_placeholder(e.companyName or "")
        has_dates = bool(e.startDate) or bool(e.endDate) or e.isCurrent
        if not has_company and not has_dates:
            demoted.append(ProjectDetail(
                name=e.title or "",
                description="; ".join(e.description),
                technologies=e.skillsUsed or "",
                url="",
            ))
        else:
            real_exp.append(e)

    output.experienceDetails = real_exp
    output.projects = _dedup_projects(all_projects + demoted)

    if demoted:
        log(f"[merge_raw] reclassified {len(demoted)} experience entr(ies) → projects (no company + no dates)")

    log(
        f"[merge_raw] final: name={output.personalDetails.firstName} {output.personalDetails.lastName}, "
        f"{len(output.experienceDetails)} exp, {len(output.educationalDetails)} edu, "
        f"{len(output.skills)} skills, {len(output.projects)} proj, "
        f"{len(output.certifications)} cert, {len(output.languages)} lang"
    )

    return output


def _split_paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]


def _split_long_paragraph(para: str, max_chars: int) -> list[str]:
    """Split an oversized paragraph on line breaks → sentence endings → hard-cut."""
    if len(para) <= max_chars:
        return [para]
    parts: list[str] = []
    buf = ""
    for line in para.split("\n"):
        if not line.strip():
            continue
        cand = (buf + "\n" + line).strip() if buf else line
        if len(cand) <= max_chars:
            buf = cand
            continue
        if buf:
            parts.append(buf)
            buf = ""
        if len(line) <= max_chars:
            buf = line
            continue
        # line itself is too big → sentence split
        s_buf = ""
        for s in re.split(r"(?<=[\.!?])\s+", line):
            if not s.strip():
                continue
            s_cand = (s_buf + " " + s).strip() if s_buf else s
            if len(s_cand) <= max_chars:
                s_buf = s_cand
            else:
                if s_buf:
                    parts.append(s_buf)
                if len(s) <= max_chars:
                    s_buf = s
                else:
                    for start in range(0, len(s), max_chars):
                        parts.append(s[start:start + max_chars])
                    s_buf = ""
        if s_buf:
            buf = s_buf
    if buf:
        parts.append(buf)
    return parts


def chunk_text_for_raw(text: str, max_chars: int) -> list[str]:
    """Split resume text into semantic chunks capped at ~max_chars.

    Greedy packing of paragraphs (\\n\\n-separated); oversized paragraphs are
    re-split on line breaks → sentence endings → hard-cut. Preserves bullet
    list shape.
    """
    if not text or not text.strip():
        return []
    if max_chars <= 0:
        return [text.strip()]
    paragraphs = _split_paragraphs(text)
    chunks: list[str] = []
    buf = ""
    for para in paragraphs:
        pieces = _split_long_paragraph(para, max_chars) if len(para) > max_chars else [para]
        for piece in pieces:
            if not buf:
                buf = piece
                continue
            cand = buf + "\n\n" + piece
            if len(cand) <= max_chars:
                buf = cand
            else:
                chunks.append(buf)
                buf = piece
    if buf:
        chunks.append(buf)
    return chunks


async def process_raw(
    pages: list[str],
    log_fn: Optional[LogFn] = None,
    progress_fn: Optional[ProgressFn] = None,
) -> ResumeOutput:
    """Chunk the resume by char limit, fire one LLM call per chunk with the
    partial-JSON prompt, then merge. Each call can return only the fields it
    sees in that chunk — missing keys are fine and merged in naturally.

    A single chunk's failure does not sink the parse; other chunks still merge.
    """
    def _log(message: str, level: str = "info") -> None:
        getattr(logger, level, logger.info)(message)
        if log_fn:
            log_fn(message, level)

    joined = "\n\n".join(p.strip() for p in pages if p and p.strip())
    chunks = chunk_text_for_raw(joined, settings.raw_chunk_max_chars)
    chunks = [c for c in chunks if len(c.strip()) >= settings.raw_chunk_min_chars]

    _log(f"Starting raw processing: {len(pages)} page(s) → {len(chunks)} chunk(s) (cap {settings.raw_chunk_max_chars} chars)")

    if not chunks:
        _log("[raw] no chunks produced — nothing to parse", "warning")
        return ResumeOutput()

    if progress_fn:
        progress_fn(0, len(chunks))

    _per_parse_sem = asyncio.Semaphore(settings.per_parse_concurrency)
    done_count = 0
    total_chunks = len(chunks)

    async def _call_once(label: str, prompt: str, max_tokens: int, temperature: float) -> str | None:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(invoke_llm, prompt, max_tokens, temperature),
                timeout=settings.raw_call_timeout_seconds,
            )
        except asyncio.TimeoutError:
            _log(f"[raw] {label} timed out after {settings.raw_call_timeout_seconds}s", "error")
            return None
        except Exception as e:
            _log(f"[raw] {label} failed: {e}", "error")
            return None

    def _dump_debug(label: str, raw: str) -> None:
        try:
            import os
            dump_dir = "/tmp/resume-parser-debug"
            os.makedirs(dump_dir, exist_ok=True)
            path = os.path.join(dump_dir, f"{label}_{int(time.time())}.txt")
            with open(path, "w", encoding="utf-8") as f:
                f.write(raw or "")
            _log(f"[raw] {label} raw response dumped to {path}", "warning")
        except Exception as e:
            _log(f"[raw] {label} debug dump failed: {e}", "warning")

    async def _invoke_chunk(idx: int, text: str) -> tuple[int, dict | None]:
        nonlocal done_count
        label = f"chunk_{idx + 1}"
        prompt = build_raw_page_prompt(text, idx + 1, total_chunks)
        max_tokens = settings.raw_chunk_max_tokens
        _log(f"[raw] {label}: {len(text)} chars → {max_tokens} max_tokens")

        async with _per_parse_sem:
            try:
                t0 = time.time()
                raw = await _call_once(label, prompt, max_tokens, 0.1)
                elapsed = time.time() - t0
                if raw is None:
                    return idx, None
                _log(f"[raw] {label} done in {elapsed:.1f}s ({len(raw)} chars)")
                _log(f"[raw] {label} preview: {raw[:200]}{'...' if len(raw) > 200 else ''}")

                parsed = _parse_chunk_json(raw, label)
                if parsed is not None:
                    return idx, parsed

                _log(f"[raw] {label} JSON parse failed, retrying with temperature=0.01", "warning")
                _dump_debug(f"{label}_attempt1", raw)

                # Some hosted LLMs reject 0.0 temperature; keep a tiny positive value.
                # 0.01 is effectively greedy and remains valid.
                t1 = time.time()
                raw2 = await _call_once(f"{label}.retry", prompt, max_tokens, 0.01)
                retry_elapsed = time.time() - t1
                if raw2 is None:
                    return idx, None
                _log(f"[raw] {label} retry done in {retry_elapsed:.1f}s ({len(raw2)} chars)")
                parsed2 = _parse_chunk_json(raw2, f"{label}.retry")
                if parsed2 is None:
                    _dump_debug(f"{label}_attempt2", raw2)
                    _log(f"[raw] {label} retry also unparseable — chunk contributes nothing", "error")
                return idx, parsed2
            finally:
                done_count += 1
                if progress_fn:
                    progress_fn(done_count, total_chunks)

    _log(f"[raw] firing {total_chunks} chunk calls (max {settings.per_parse_concurrency} concurrent)")
    results = await asyncio.gather(*(_invoke_chunk(i, c) for i, c in enumerate(chunks)))

    results.sort(key=lambda r: r[0])
    per_chunk_data = [parsed for _, parsed in results]

    _log("[raw] merging chunk results")
    output = merge_page_results(per_chunk_data, _log)
    output = _finalize_output(output, joined, _log)
    _log("[raw] processing complete")

    return output


class WholeParseFailed(Exception):
    """Whole-document single-call path produced no parseable JSON."""


def _looks_truncated(raw: str | None) -> bool:
    """True when the LLM output was cut off mid-generation (hit the token cap).

    A complete JSON object response ends with a closing brace once markdown
    fences and trailing whitespace are stripped. When the model runs out of
    output tokens it stops mid-string/array, so the last real character is not
    a '}'. This is the signal to fall back to the raw-chunked path, where each
    section gets its own token budget — otherwise _repair_truncated_json
    silently closes the JSON and everything after the cut point is lost.
    """
    if not raw:
        return False
    s = raw.strip()
    if s.endswith("```"):
        s = s[:-3].strip()
    return not s.endswith("}")


async def process_whole(
    text: str,
    log_fn: Optional[LogFn] = None,
    progress_fn: Optional[ProgressFn] = None,
) -> ResumeOutput:
    """Single LLM call over the full resume text → merged ResumeOutput.

    Fastest and highest-quality path for resumes that fit inside one output
    window. Reuses merge_page_results (1-element list) for coercion, dedup,
    and the experience→project reclassifier. Raises WholeParseFailed if the
    LLM returns no parseable JSON even after a low-temperature retry — caller
    can fall back to process_raw.
    """
    def _log(message: str, level: str = "info") -> None:
        getattr(logger, level, logger.info)(message)
        if log_fn:
            log_fn(message, level)

    if not text or not text.strip():
        _log("[whole] empty text — returning empty output", "warning")
        return ResumeOutput()

    prompt = build_raw_whole_prompt(text)
    max_tokens = settings.whole_max_tokens
    _log(f"[whole] {len(text)} chars → prompt {len(prompt)} chars, {max_tokens} max_tokens")

    if progress_fn:
        progress_fn(0, 1)

    async def _call_once(label: str, temperature: float) -> str | None:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(invoke_llm, prompt, max_tokens, temperature),
                timeout=settings.whole_call_timeout_seconds,
            )
        except asyncio.TimeoutError:
            _log(f"[whole] {label} timed out after {settings.whole_call_timeout_seconds}s", "error")
            return None
        except Exception as e:
            _log(f"[whole] {label} failed: {e}", "error")
            return None

    t0 = time.time()
    raw = await _call_once("call", 0.1)
    elapsed = time.time() - t0

    parsed: dict | None = None
    winning_raw: str | None = None
    if raw is not None:
        _log(f"[whole] call done in {elapsed:.1f}s ({len(raw)} chars)")
        parsed = _parse_chunk_json(raw, "whole")
        if parsed is not None:
            winning_raw = raw

    if parsed is None:
        _log("[whole] primary call unparseable — retrying at temp=0.01", "warning")
        t1 = time.time()
        raw2 = await _call_once("retry", 0.01)
        retry_elapsed = time.time() - t1
        if raw2 is not None:
            _log(f"[whole] retry done in {retry_elapsed:.1f}s ({len(raw2)} chars)")
            parsed = _parse_chunk_json(raw2, "whole.retry")
            if parsed is not None:
                winning_raw = raw2

    if progress_fn:
        progress_fn(1, 1)

    if parsed is None:
        _log("[whole] no parseable JSON — falling back to raw chunked", "error")
        raise WholeParseFailed("whole-path produced no parseable JSON")

    # Parseable but cut off at the token cap: _repair_truncated_json closed the
    # JSON early, so late sections (skills/experience/projects/languages) are
    # silently missing. Fall back to raw-chunked where each section gets its own
    # output budget, rather than return a partial result.
    if _looks_truncated(winning_raw):
        _log("[whole] output truncated at token cap — falling back to raw chunked", "warning")
        raise WholeParseFailed("whole-path output truncated")

    _log("[whole] merging (single-element)")
    output = merge_page_results([parsed], _log)
    output = _finalize_output(output, text, _log)
    _log("[whole] processing complete")
    return output
