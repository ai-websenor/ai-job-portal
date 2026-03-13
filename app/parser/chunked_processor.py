"""Per-section chunked resume processing.

Splits resume into sections, routes each to a focused prompt, calls LLM
per section in parallel, and merges results into a single ResumeOutput.
"""

import asyncio
import json
import logging
import re
import time
from typing import Callable, Optional

from app.models.resume import (
    Achievement,
    Certification,
    ConfidenceField,
    Education,
    Experience,
    Language,
    PersonalInfo,
    Project,
    Publication,
    ResumeOutput,
)
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
    # Experience needs more output tokens (both experience[] + projects[])
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

    results = await asyncio.gather(
        *[_invoke_chunk(ct, p, mt) for ct, p, mt in tasks]
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
# Safe per-item parsers
# ---------------------------------------------------------------------------


def _fix_list_value(val):
    """Convert list values to joined strings. LLM sometimes returns lists instead of strings."""
    import ast
    if isinstance(val, list):
        return "; ".join(str(item).lstrip("• ").strip() for item in val if item)
    if isinstance(val, str) and val.startswith("[") and val.endswith("]"):
        # Try JSON first (double quotes), then Python literal (single quotes)
        for parser in (json.loads, ast.literal_eval):
            try:
                items = parser(val)
                if isinstance(items, list):
                    return "; ".join(str(item).lstrip("• ").strip() for item in items if item)
            except (json.JSONDecodeError, ValueError, SyntaxError):
                continue
    return val


def _sanitize_confidence_fields(data: dict, model_cls) -> dict:
    """Convert bare nulls/strings/lists to ConfidenceField format before Pydantic parse.

    Handles LLM quirks: null instead of {"value": null}, lists instead of joined strings,
    Python list repr strings like "['a', 'b']".
    """
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, val in data.items():
        field_info = model_cls.model_fields.get(key)
        if field_info and field_info.annotation is ConfidenceField:
            if val is None:
                sanitized[key] = {"value": None, "confidence": 0.0}
            elif isinstance(val, list):
                sanitized[key] = {"value": _fix_list_value(val), "confidence": 0.8}
            elif isinstance(val, str):
                sanitized[key] = {"value": _fix_list_value(val), "confidence": 0.8}
            elif isinstance(val, dict):
                # Fix list-as-string inside {"value": "['a', 'b']", "confidence": ...}
                if "value" in val and isinstance(val.get("value"), (list, str)):
                    val = {**val, "value": _fix_list_value(val["value"])}
                sanitized[key] = val
            else:
                sanitized[key] = {"value": str(val), "confidence": 0.7}
        else:
            sanitized[key] = val
    return sanitized


def _safe_parse(model_cls, item, label="item"):
    """Parse a single item into a Pydantic model, return None on failure."""
    try:
        if not isinstance(item, dict):
            return None
        sanitized = _sanitize_confidence_fields(item, model_cls)
        return model_cls(**sanitized)
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


def _filter_empty_languages(langs: list[Language]) -> list[Language]:
    """Remove language entries where name.value is null/empty."""
    return [lang for lang in langs if lang.name.value]


def _parse_confidence_list(data: list) -> list[ConfidenceField]:
    """Parse a list into ConfidenceField entries."""
    results = []
    for item in data:
        try:
            if isinstance(item, dict):
                results.append(ConfidenceField(**item))
            elif isinstance(item, str):
                results.append(ConfidenceField(value=item, confidence=0.9))
        except Exception as e:
            logger.debug("Skipping invalid confidence item: %s", e)
    return results


# ---------------------------------------------------------------------------
# Merge — each chunk type maps to exactly one ResumeOutput field
# ---------------------------------------------------------------------------


def merge_chunk_results(raw_results: dict[str, str | None], _log=None) -> ResumeOutput:
    """Parse each chunk's raw LLM output and merge into a single ResumeOutput.

    Each chunk type maps to exactly one non-overlapping field in ResumeOutput.
    Order doesn't matter — results are dispatched by dict key, not arrival order.
    """
    def log(msg, level="info"):
        getattr(logger, level, logger.info)(msg)
        if _log:
            _log(msg, level)

    output = ResumeOutput()

    # --- personal ---
    personal_raw = _parse_chunk_json(raw_results.get("personal"), "personal")
    if personal_raw:
        log(f"[merge] Personal chunk keys: {list(personal_raw.keys())}")
        # Handle both {"personal": {...}} wrapper and flat {...} with personal fields
        personal_dict = personal_raw.get("personal", personal_raw) if isinstance(personal_raw.get("personal"), dict) else personal_raw
        personal_keys = {"name", "first_name", "last_name", "email", "phone", "summary", "headline"}
        if isinstance(personal_dict, dict) and personal_keys & set(personal_dict.keys()):
            try:
                sanitized = _sanitize_confidence_fields(personal_dict, PersonalInfo)
                output.personal = PersonalInfo(**sanitized)
                log(f"[merge] Personal: name={output.personal.name.value}, email={output.personal.email.value}")
            except Exception as e:
                log(f"[merge] Failed to parse PersonalInfo: {e}", "warning")
        else:
            log(f"[merge] Personal data has unexpected keys: {list(personal_raw.keys())}", "warning")

        # Extract languages from personal chunk if present (e.g. "Languages Known" in Personal Details)
        lang_data = personal_raw.get("languages")
        if isinstance(lang_data, list) and lang_data and not raw_results.get("languages"):
            parsed_langs = _filter_empty_languages(_parse_list(Language, lang_data, "language"))
            if parsed_langs:
                output.languages = parsed_langs
                log(f"[merge] Languages (from personal): {len(output.languages)} entries")
            else:
                # LLM may return simple strings like ["English", "Hindi"]
                for item in lang_data:
                    if isinstance(item, str):
                        output.languages.append(Language(
                            name=ConfidenceField(value=item, confidence=0.8),
                            proficiency=ConfidenceField()
                        ))
                if output.languages:
                    log(f"[merge] Languages (from personal, string fallback): {len(output.languages)} entries")
    else:
        log("[merge] Personal chunk returned no parseable data", "warning")

    # --- experience ---
    exp_data = _parse_chunk_json(raw_results.get("experience"), "experience")
    if exp_data and "experience" in exp_data and isinstance(exp_data["experience"], list):
        output.experience = _parse_list(Experience, exp_data["experience"], "experience")
        log(f"[merge] Experience: {len(output.experience)} entries")
        for i, exp in enumerate(output.experience):
            desc_preview = (exp.description.value or "")[:80]
            log(f"[merge]   [{i}] {exp.role.value} @ {exp.company.value} | {desc_preview}...")

        # Extract projects from experience chunk (common in resumes with embedded projects)
        if "projects" in exp_data and isinstance(exp_data["projects"], list) and not raw_results.get("projects"):
            output.projects = _parse_list(Project, exp_data["projects"], "project")
            log(f"[merge] Projects (from experience): {len(output.projects)} entries")
    else:
        log("[merge] Experience chunk returned no data", "warning")

    # --- education ---
    data = _parse_chunk_json(raw_results.get("education"), "education")
    if data and "education" in data and isinstance(data["education"], list):
        output.education = _parse_list(Education, data["education"], "education")
        log(f"[merge] Education: {len(output.education)} entries")

    # --- skills ---
    skills_data = _parse_chunk_json(raw_results.get("skills"), "skills")
    if skills_data and "skills" in skills_data and isinstance(skills_data["skills"], list):
        output.skills = _parse_confidence_list(skills_data["skills"])
        skill_names = [s.value for s in output.skills[:10]]
        log(f"[merge] Skills: {len(output.skills)} entries — {skill_names}{'...' if len(output.skills) > 10 else ''}")

        # Extract spoken languages from skills chunk (e.g. "Languages: English, Hindi" inside Technical Skills)
        if not output.languages and "languages" in skills_data and isinstance(skills_data["languages"], list):
            langs = _filter_empty_languages(_parse_list(Language, skills_data["languages"], "language"))
            if langs:
                output.languages = langs
                log(f"[merge] Languages (from skills): {len(output.languages)} entries")

    # --- certifications ---
    data = _parse_chunk_json(raw_results.get("certifications"), "certifications")
    if data and "certifications" in data and isinstance(data["certifications"], list):
        output.certifications = _parse_list(Certification, data["certifications"], "certification")
        log(f"[merge] Certifications: {len(output.certifications)} entries")

    # --- projects ---
    data = _parse_chunk_json(raw_results.get("projects"), "projects")
    if data and "projects" in data and isinstance(data["projects"], list):
        output.projects = _parse_list(Project, data["projects"], "project")
        log(f"[merge] Projects: {len(output.projects)} entries")

    # --- achievements ---
    data = _parse_chunk_json(raw_results.get("achievements"), "achievements")
    if data and "achievements" in data and isinstance(data["achievements"], list):
        output.achievements = _parse_list(Achievement, data["achievements"], "achievement")
        log(f"[merge] Achievements: {len(output.achievements)} entries")

    # --- publications ---
    data = _parse_chunk_json(raw_results.get("publications"), "publications")
    if data and "publications" in data and isinstance(data["publications"], list):
        output.publications = _parse_list(Publication, data["publications"], "publication")
        log(f"[merge] Publications: {len(output.publications)} entries")

    # --- languages ---
    data = _parse_chunk_json(raw_results.get("languages"), "languages")
    if data and "languages" in data and isinstance(data["languages"], list):
        output.languages = _filter_empty_languages(_parse_list(Language, data["languages"], "language"))
        log(f"[merge] Languages: {len(output.languages)} entries")

    # --- hobbies ---
    data = _parse_chunk_json(raw_results.get("hobbies"), "hobbies")
    if data and "hobbies" in data and isinstance(data["hobbies"], list):
        output.hobbies = _parse_confidence_list(data["hobbies"])
        log(f"[merge] Hobbies: {len(output.hobbies)} entries")

    # --- declaration → stored in personal.declaration ---
    data = _parse_chunk_json(raw_results.get("declaration"), "declaration")
    if data and "declaration" in data and isinstance(data["declaration"], dict):
        try:
            output.personal.declaration = ConfidenceField(**data["declaration"])
            log(f"[merge] Declaration: {(output.personal.declaration.value or '')[:60]}")
        except Exception as e:
            log(f"[merge] Failed to parse declaration: {e}", "warning")

    log(f"Merge complete: name={output.personal.name.value or '(none)'}, {len(output.experience)} exp, {len(output.education)} edu, {len(output.skills)} skills, {len(output.languages)} lang")

    return output
