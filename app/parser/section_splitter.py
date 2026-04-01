import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Section label -> compiled regex pattern
# Case-insensitive, anchored to line start, optional trailing colon/dash
SECTION_PATTERNS: dict[str, re.Pattern] = {
    "personal": re.compile(
        r"^\s*(?:personal\s+(?:info(?:rmation)?|details)|contact\s+(?:info(?:rmation)?|details))\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "summary": re.compile(
        r"^\s*(?:(?:professional|executive|profile|career)\s+summary|summary|objective|career\s+objective|about\s+me|profile|carri?er\s+objective)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "experience": re.compile(
        r"^\s*(?:professional\s+work\s+experience|(?:work|professional)\s+experience|work\s+details|experience|employment\s+history|(?:work|career)\s+history)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "education": re.compile(
        r"^\s*(?:education(?:al)?\s+(?:qualifications?|background|details)|education|academic\s+(?:qualifications?|details))\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "skills": re.compile(
        r"^\s*(?:(?:technical|core|key|professional)\s+(?:skills|competencies|strengths)|skills|technologies|tech\s+stack|areas\s+of\s+expertise|core\s+competencies)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "projects": re.compile(
        r"^\s*(?:(?:key|academic|side|major)\s+projects|projects|project\s+(?:details|experience|work|summary))\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "certifications": re.compile(
        r"^\s*(?:(?:professional\s+)?certifications?|certificates?|licenses?\s*(?:&|and)\s*certifications?)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "achievements": re.compile(
        r"^\s*(?:(?:key\s+)?achievements?|awards?|accomplishments|honours|honors|awards?\s*(?:&|and)\s*achievements?)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "publications": re.compile(
        r"^\s*(?:publications?|papers|research)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "languages": re.compile(
        # Matches: "Languages Known", "Languages:", "Language Proficiency", typos like "Launguage"
        # Does NOT match bare "Languages" (could be skills table category)
        r"^\s*(?:"
        r"languages\s+(?:known|spoken|proficiency)"  # Languages + qualifier
        r"|language\s+proficiency"                    # Language Proficiency
        r"|languages\s*[:—\-]"                        # Languages: (with colon/dash)
        r"|laungu[ae]ges?"                              # Typos: Launguage, Launguages
        r"|lang[au]uges?"                              # Typos: Langauges, Langauge
        r"|languges?"                                  # Typos: Languges (missing a)
        r")\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "hobbies": re.compile(
        r"^\s*(?:hobbies|(?:personal\s+)?interests|extracurricular(?:\s+activities)?)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
    "declaration": re.compile(
        r"^\s*(?:declaration|affirmation|undertaking)\s*[:—\-]?\s*$",
        re.IGNORECASE | re.MULTILINE,
    ),
}


@dataclass
class ResumeSection:
    name: str
    text: str
    start_pos: int
    end_pos: int


def split_into_sections(text: str) -> list[ResumeSection]:
    """Split resume text into labeled sections using regex header detection."""

    # Collect all header matches: (start, end, label)
    matches: list[tuple[int, int, str]] = []
    for label, pattern in SECTION_PATTERNS.items():
        for m in pattern.finditer(text):
            matches.append((m.start(), m.end(), label))

    if not matches:
        logger.info("No section headers found, returning full_resume fallback")
        return [ResumeSection(name="full_resume", text=text.strip(), start_pos=0, end_pos=len(text))]

    # Sort by position
    matches.sort(key=lambda m: m[0])

    # Deduplicate: first occurrence of each label wins, extras get _extra suffix
    seen: dict[str, int] = {}
    deduped: list[tuple[int, int, str]] = []
    for start, end, label in matches:
        if label in seen:
            seen[label] += 1
            deduped.append((start, end, f"{label}_extra{seen[label]}"))
        else:
            seen[label] = 0
            deduped.append((start, end, label))

    sections: list[ResumeSection] = []

    # Text before first header -> 'header' section (name/contact usually here)
    first_start = deduped[0][0]
    preamble = text[:first_start].strip()
    if len(preamble) > 15:
        sections.append(ResumeSection(name="header", text=preamble, start_pos=0, end_pos=first_start))

    # Build sections from header boundaries
    for i, (start, end, label) in enumerate(deduped):
        next_start = deduped[i + 1][0] if i + 1 < len(deduped) else len(text)
        section_text = text[end:next_start].strip()
        sections.append(ResumeSection(name=label, text=section_text, start_pos=start, end_pos=next_start))

    logger.info("Split resume into %d sections: %s", len(sections), [s.name for s in sections])
    return sections
