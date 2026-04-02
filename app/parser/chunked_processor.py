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
    PersonalDetails,
    ProjectDetail,
    ResumeOutput,
    SkillDetail,
)
from app.config import settings
from app.parser.chunk_prompts import build_section_prompt
from app.parser.sagemaker import invoke_llm
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
    logger.info("[%s] Extracted JSON: %d chars", chunk_type, len(json_str))

    try:
        data = json.loads(json_str)
        logger.info("[%s] JSON parsed OK, keys: %s", chunk_type, list(data.keys()) if isinstance(data, dict) else type(data).__name__)
        return data
    except json.JSONDecodeError as e:
        logger.warning("[%s] JSON parse failed at pos %d: %s", chunk_type, e.pos, e.msg)
        repaired = _repair_truncated_json(json_str)
        if repaired is not None:
            logger.info("[%s] JSON repair succeeded", chunk_type)
            return repaired
        logger.error("[%s] JSON repair also failed", chunk_type)
        return None


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

    # proficiencyLevel: default to "intermediate" if empty/placeholder
    if "proficiencyLevel" in coerced:
        pl = coerced["proficiencyLevel"]
        if not pl or _is_placeholder(pl):
            coerced["proficiencyLevel"] = "intermediate"

    # employmentType: default to "full_time" if empty/placeholder
    if "employmentType" in coerced:
        et = coerced["employmentType"]
        if not et or _is_placeholder(et):
            coerced["employmentType"] = "full_time"

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
            personal_keys = {"firstName", "lastName", "phone", "headline", "professionalSummary", "country", "state", "city", "linkedin", "github", "website", "gender"}
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
                desc_preview = (exp.description or "")[:80]
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
