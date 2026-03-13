"""Dynamic token estimation for Ministral 14B resume parsing (32K context window)."""

import logging
import math
import re

logger = logging.getLogger(__name__)

# --- Model constants ---
MODEL_CONTEXT_WINDOW = 32_768
PROMPT_OVERHEAD_TOKENS = 2_700
CHUNKING_THRESHOLD_RATIO = 0.70
CHARS_PER_TOKEN = 4.0

# --- Output base & per-section weights ---
OUTPUT_BASE_TOKENS = 800
SECTION_WEIGHTS = {
    "experience": 350,
    "projects": 300,
    "education": 150,
    "skills": 20,
    "certifications": 80,
    "achievements": 50,
    "publications": 60,
    "languages": 30,
    "hobbies": 20,
}

# --- Bullet multiplier thresholds ---
BULLET_HIGH_THRESHOLD = 30
BULLET_HIGH_MULTIPLIER = 1.3
BULLET_MID_THRESHOLD = 15
BULLET_MID_MULTIPLIER = 1.15

# --- Output clamp range ---
OUTPUT_MIN_TOKENS = 4_000
OUTPUT_MAX_TOKENS = 16_000

# --- Regex patterns for section counting ---
DATE_RANGE_RE = re.compile(
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*\d{4}"
    r"\s*[-\u2013\u2014to]+\s*"
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*\d{4}|Present|Current|Till\s+(?:Date|Now)|Ongoing)",
    re.IGNORECASE,
)

BULLET_RE = re.compile(r"^\s*(?:[-\u2022\u25e6\u25aa\u2023*>]|\d+[.)]\s)", re.MULTILINE)

PROJECT_HEADER_RE = re.compile(
    r"(?:^|\n)\s*(?:Project\s*(?:Name|Title)?[\s:]+\S|#{1,3}\s*Project)",
    re.IGNORECASE,
)

EDUCATION_DEGREE_RE = re.compile(
    r"\b(?:B\.?\s*Tech|B\.?\s*E|B\.?\s*Sc|B\.?\s*Com|B\.?\s*A|B\.?\s*C\.?\s*A"
    r"|M\.?\s*Tech|M\.?\s*E|M\.?\s*Sc|M\.?\s*Com|M\.?\s*A|M\.?\s*C\.?\s*A"
    r"|MBA|MCA|BCA|Ph\.?\s*D|Diploma|HSC|SSC|XII|X|12th|10th"
    r"|Bachelor|Master|Associate|Doctorate)\b",
    re.IGNORECASE,
)

SKILLS_SECTION_RE = re.compile(
    r"(?:Skills|Technical\s+Skills|Core\s+Skills|Technologies|Tools|Competencies)"
    r"[\s:]*\n?(.*?)(?:\n\s*\n|\Z)",
    re.IGNORECASE | re.DOTALL,
)

CERTIFICATION_RE = re.compile(
    r"\b(?:Certified|Certification|Certificate|AWS\s+Certified|Azure\s+Certified"
    r"|Google\s+Cloud\s+Certified|PMP|CISSP|CKA|CKAD|Scrum\s+Master)\b",
    re.IGNORECASE,
)

ACHIEVEMENT_RE = re.compile(
    r"(?:^|\n)\s*(?:Achievement|Award|Accomplishment|Honour|Honor)s?\b",
    re.IGNORECASE,
)

PUBLICATION_RE = re.compile(
    r"(?:^|\n)\s*(?:Publication|Paper|Research|Journal|Conference\s+Paper)s?\b",
    re.IGNORECASE,
)

LANGUAGE_SECTION_RE = re.compile(
    r"(?:Languages?\s+Known|Languages?\s+Proficiency|Languages?)\s*[\s:]*\n?(.*?)(?:\n\s*\n|\Z)",
    re.IGNORECASE | re.DOTALL,
)

HOBBY_SECTION_RE = re.compile(
    r"(?:Hobbies|Interests|Personal\s+Interests|Extracurricular)\s*[\s:]*\n?(.*?)(?:\n\s*\n|\Z)",
    re.IGNORECASE | re.DOTALL,
)


def estimate_input_tokens(text: str) -> int:
    """Conservative token estimate: ~4 chars per token."""
    return math.ceil(len(text) / CHARS_PER_TOKEN)


def count_resume_sections(text: str) -> dict:
    """Count occurrences of resume sections using regex heuristics."""
    experience = len(DATE_RANGE_RE.findall(text))
    bullets = len(BULLET_RE.findall(text))
    projects = len(PROJECT_HEADER_RE.findall(text))
    education = len(EDUCATION_DEGREE_RE.findall(text))

    # Skills: count comma-separated items inside skills sections
    skills = 0
    for match in SKILLS_SECTION_RE.finditer(text):
        items = [s.strip() for s in re.split(r"[,\n|]", match.group(1)) if s.strip()]
        skills += len(items)

    certifications = len(CERTIFICATION_RE.findall(text))

    # Achievements: count bullet/list items under achievement headers
    achievements = 0
    for match in ACHIEVEMENT_RE.finditer(text):
        start = match.end()
        block = text[start : start + 500]
        achievements += max(1, len(BULLET_RE.findall(block)))

    # Publications: count entries under publication headers
    publications = 0
    for match in PUBLICATION_RE.finditer(text):
        start = match.end()
        block = text[start : start + 500]
        publications += max(1, len(BULLET_RE.findall(block)))

    # Languages: count comma-separated items
    languages = 0
    for match in LANGUAGE_SECTION_RE.finditer(text):
        items = [s.strip() for s in re.split(r"[,\n|]", match.group(1)) if s.strip()]
        languages += len(items)

    # Hobbies: count comma-separated items
    hobbies = 0
    for match in HOBBY_SECTION_RE.finditer(text):
        items = [s.strip() for s in re.split(r"[,\n|]", match.group(1)) if s.strip()]
        hobbies += len(items)

    counts = {
        "experience": experience,
        "bullets": bullets,
        "projects": projects,
        "education": education,
        "skills": skills,
        "certifications": certifications,
        "achievements": achievements,
        "publications": publications,
        "languages": languages,
        "hobbies": hobbies,
    }
    logger.debug("Resume section counts: %s", counts)
    return counts


def estimate_output_tokens(text: str) -> int:
    """Estimate output tokens based on resume section counts.

    Formula: 800 base + per-section weights, with bullet multiplier.
    Clamped to [4000, 16000].
    """
    sections = count_resume_sections(text)

    tokens = OUTPUT_BASE_TOKENS
    for section, weight in SECTION_WEIGHTS.items():
        tokens += weight * sections.get(section, 0)

    # Bullet multiplier
    bullet_count = sections.get("bullets", 0)
    if bullet_count > BULLET_HIGH_THRESHOLD:
        tokens = int(tokens * BULLET_HIGH_MULTIPLIER)
    elif bullet_count > BULLET_MID_THRESHOLD:
        tokens = int(tokens * BULLET_MID_MULTIPLIER)

    clamped = max(OUTPUT_MIN_TOKENS, min(OUTPUT_MAX_TOKENS, tokens))

    logger.debug(
        "Output token estimate: raw=%d, clamped=%d (bullets=%d)",
        tokens,
        clamped,
        bullet_count,
    )
    return clamped


def needs_chunking(text: str) -> bool:
    """Check if resume exceeds safe context budget (70% of 32K window).

    Budget: input_tokens + 2700 prompt overhead + output_tokens > 70% of 32768.
    """
    input_tokens = estimate_input_tokens(text)
    output_tokens = estimate_output_tokens(text)
    total = input_tokens + PROMPT_OVERHEAD_TOKENS + output_tokens
    budget = int(MODEL_CONTEXT_WINDOW * CHUNKING_THRESHOLD_RATIO)
    result = total > budget

    logger.info(
        "Token budget: input=%d + prompt=%d + output=%d = %d / %d (%s)",
        input_tokens,
        PROMPT_OVERHEAD_TOKENS,
        output_tokens,
        total,
        budget,
        "CHUNKING NEEDED" if result else "OK",
    )
    return result
