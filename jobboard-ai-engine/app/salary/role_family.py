"""Mapping an unfamiliar job title onto a role family we can price.

With 53 distinct titles across 57 active jobs, an exact title match almost
never finds anything. A title like "ABC Technologies Developer - Urgent" has no
twin, but it is plainly a backend developer role, and there are backend
developer postings we can price.

The static table is tried first and answers most real titles for nothing. The
model is only the fallback, and it is only ever allowed to *choose from this
list* — it never invents a family and it never sees or produces a number.
"""

from __future__ import annotations

import logging

from app.exceptions import ExternalServiceError
from app.parser.llm import invoke_llm

logger = logging.getLogger(__name__)

# The families we are willing to reason about. Kept deliberately broad: a
# family only has to be specific enough that its postings price similarly.
ROLE_FAMILIES: tuple[str, ...] = (
    "full stack developer",
    "frontend developer",
    "backend developer",
    "mobile developer",
    "devops engineer",
    "data engineer",
    "data analyst",
    "machine learning engineer",
    "qa engineer",
    "ui ux designer",
    "graphic designer",
    "product manager",
    "project manager",
    "business analyst",
    "system administrator",
    "database administrator",
    "cyber security engineer",
    "technical support engineer",
    "hr recruiter",
    "sales executive",
    "marketing executive",
    "content writer",
    "accountant",
    "operations executive",
    "customer support executive",
    "teacher",
    "nurse",
    "driver",
    "delivery executive",
    "field technician",
    "electrician",
    "plumber",
    "cook",
    "security guard",
    "warehouse associate",
)

# Phrase -> family. Longest phrases are matched first so "react native" lands
# on mobile rather than frontend, and "full stack" beats "stack".
_STATIC_MAP: dict[str, str] = {
    # Engineering
    "full stack": "full stack developer",
    "fullstack": "full stack developer",
    "full-stack": "full stack developer",
    "mern": "full stack developer",
    "mean stack": "full stack developer",
    "react native": "mobile developer",
    "android": "mobile developer",
    "ios developer": "mobile developer",
    "flutter": "mobile developer",
    "mobile app": "mobile developer",
    "frontend": "frontend developer",
    "front end": "frontend developer",
    "front-end": "frontend developer",
    "ui developer": "frontend developer",
    "react developer": "frontend developer",
    "angular": "frontend developer",
    "vue": "frontend developer",
    "backend": "backend developer",
    "back end": "backend developer",
    "back-end": "backend developer",
    "node developer": "backend developer",
    "nodejs developer": "backend developer",
    "java developer": "backend developer",
    "python developer": "backend developer",
    "php developer": "backend developer",
    "laravel": "backend developer",
    "django": "backend developer",
    "dot net": "backend developer",
    ".net": "backend developer",
    "golang": "backend developer",
    "ruby on rails": "backend developer",
    "api developer": "backend developer",
    "software engineer": "backend developer",
    "software developer": "backend developer",
    "web developer": "full stack developer",
    # Platform and data
    "devops": "devops engineer",
    "site reliability": "devops engineer",
    "sre": "devops engineer",
    "cloud engineer": "devops engineer",
    "kubernetes": "devops engineer",
    "aws engineer": "devops engineer",
    "platform engineer": "devops engineer",
    "data engineer": "data engineer",
    "etl": "data engineer",
    "big data": "data engineer",
    "data scientist": "machine learning engineer",
    "machine learning": "machine learning engineer",
    "ml engineer": "machine learning engineer",
    "ai engineer": "machine learning engineer",
    "deep learning": "machine learning engineer",
    "data analyst": "data analyst",
    "business intelligence": "data analyst",
    "power bi": "data analyst",
    "tableau": "data analyst",
    # Quality, security, ops
    "qa": "qa engineer",
    "quality assurance": "qa engineer",
    "test engineer": "qa engineer",
    "tester": "qa engineer",
    "sdet": "qa engineer",
    "automation test": "qa engineer",
    "cyber security": "cyber security engineer",
    "cybersecurity": "cyber security engineer",
    "information security": "cyber security engineer",
    "penetration test": "cyber security engineer",
    "system administrator": "system administrator",
    "sysadmin": "system administrator",
    "network engineer": "system administrator",
    "database administrator": "database administrator",
    "dba": "database administrator",
    # Design and product
    "ui ux": "ui ux designer",
    "ui/ux": "ui ux designer",
    "ux designer": "ui ux designer",
    "product designer": "ui ux designer",
    "graphic designer": "graphic designer",
    "visual designer": "graphic designer",
    "video editor": "graphic designer",
    "product manager": "product manager",
    "product owner": "product manager",
    "project manager": "project manager",
    "scrum master": "project manager",
    "delivery manager": "project manager",
    "business analyst": "business analyst",
    # Business functions
    "recruiter": "hr recruiter",
    "talent acquisition": "hr recruiter",
    "human resource": "hr recruiter",
    "hr executive": "hr recruiter",
    "hr manager": "hr recruiter",
    "sales": "sales executive",
    "business development": "sales executive",
    "field sales": "sales executive",
    "digital marketing": "marketing executive",
    "seo": "marketing executive",
    "social media": "marketing executive",
    "marketing": "marketing executive",
    "content writer": "content writer",
    "copywriter": "content writer",
    "technical writer": "content writer",
    "accountant": "accountant",
    "accounts executive": "accountant",
    "finance executive": "accountant",
    "bookkeep": "accountant",
    "audit": "accountant",
    "operations": "operations executive",
    "admin executive": "operations executive",
    "back office": "operations executive",
    "customer support": "customer support executive",
    "customer service": "customer support executive",
    "customer care": "customer support executive",
    "call center": "customer support executive",
    "call centre": "customer support executive",
    "telecaller": "customer support executive",
    "bpo": "customer support executive",
    "technical support": "technical support engineer",
    "help desk": "technical support engineer",
    "service desk": "technical support engineer",
    # Non-desk roles — the blue-collar side of the board
    "teacher": "teacher",
    "tutor": "teacher",
    "faculty": "teacher",
    "lecturer": "teacher",
    "nurse": "nurse",
    "ward boy": "nurse",
    "caretaker": "nurse",
    "driver": "driver",
    "chauffeur": "driver",
    "delivery": "delivery executive",
    "rider": "delivery executive",
    "courier": "delivery executive",
    "electrician": "electrician",
    "plumber": "plumber",
    "carpenter": "field technician",
    "technician": "field technician",
    "mechanic": "field technician",
    "fitter": "field technician",
    "welder": "field technician",
    "cook": "cook",
    "chef": "cook",
    "kitchen": "cook",
    "security guard": "security guard",
    "watchman": "security guard",
    "bouncer": "security guard",
    "warehouse": "warehouse associate",
    "packer": "warehouse associate",
    "loader": "warehouse associate",
    "store keeper": "warehouse associate",
}

# Longest first, so more specific phrases win.
_ORDERED_PHRASES: list[str] = sorted(_STATIC_MAP, key=len, reverse=True)


def static_role_family(title: str | None) -> str | None:
    """Family for a title from the static table, or None if nothing matches."""
    text = " ".join(str(title or "").strip().lower().split())
    if not text:
        return None
    for phrase in _ORDERED_PHRASES:
        if phrase in text:
            return _STATIC_MAP[phrase]
    return None


def _build_prompt(title: str) -> str:
    families = "\n".join(f"- {family}" for family in ROLE_FAMILIES)
    return (
        "You are matching a job advert title to one role family from a fixed list.\n\n"
        f"Job title: {title}\n\n"
        "Role families:\n"
        f"{families}\n\n"
        "Reply with exactly one role family copied from the list above, nothing "
        "else. No explanation, no punctuation, no numbers. If none of them fit, "
        "reply with: none"
    )


def llm_role_family(title: str | None) -> str | None:
    """Ask the model to pick a family. Returns None if it cannot or will not.

    The reply is checked against `ROLE_FAMILIES` before it is used, so a
    hallucinated family is discarded rather than propagated. The model is never
    shown a salary and never asked for one.

    Raises `ExternalServiceError` when the model is unreachable — the caller
    decides whether that is worth degrading the response for.
    """
    text = " ".join(str(title or "").strip().lower().split())
    if not text:
        return None

    raw = invoke_llm(
        _build_prompt(title),
        max_tokens=24,
        temperature=0.1,
        priority="interactive",
    )

    answer = " ".join(str(raw or "").strip().lower().split())
    answer = answer.strip("\"'`.,:;-").strip()
    if not answer or answer == "none":
        return None

    if answer in ROLE_FAMILIES:
        return answer

    # Small models like to answer "Role family: backend developer".
    for family in ROLE_FAMILIES:
        if family in answer:
            return family

    logger.info("LLM returned an unknown role family %r for title %r", answer, title)
    return None


def resolve_role_family(title: str | None, allow_llm: bool = True) -> tuple[str | None, str]:
    """Family for a title plus how it was found: "static", "llm" or "none".

    The static table is always tried first — it is free, deterministic and
    covers the overwhelming majority of real titles on this board.
    """
    family = static_role_family(title)
    if family:
        return family, "static"

    if not allow_llm:
        return None, "none"

    try:
        family = llm_role_family(title)
    except ExternalServiceError:
        # Deliberately re-raised: the caller marks the response degraded.
        raise

    return (family, "llm") if family else (None, "none")
