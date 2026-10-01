"""Friendlier wording for the strengths and gaps the rules already found.

The model's entire job here is rephrasing. It is never asked who is a good
candidate, what is missing, or how many points anything is worth —
`rules.py` settled all of that before this module is called. That separation
is what makes an outage a cosmetic problem: the static wording ships instead,
the score is unchanged, and the response carries `degraded: true`.

Every rewrite is checked before it is used:

* it has to belong to an observation we sent (no invented ids),
* it has to be a sane length,
* it may not introduce a number that was not in the original,
* and it may not mention a protected characteristic.

The last two matter most. "Strong for someone his age" and "Docker appears in
73% of similar jobs" are both sentences a small model produces happily; one is
discrimination and the other is a statistic we have no data for. Either one
gets the rewrite thrown away and its static original used instead.
"""

import json
import logging
import re

from app.config import settings
from app.exceptions import ExternalServiceError
from app.parser.llm import invoke_llm

logger = logging.getLogger(__name__)

TEXT_MIN, TEXT_MAX = 10, 220

# Enough for a dozen one-line observations with JSON scaffolding. Anything
# longer is the model rambling rather than rewriting.
MAX_TOKENS = 700

# A rewrite containing any of these is discarded outright. The rules never
# produce them, so their appearance means the model started describing the
# person rather than the application. Gendered pronouns are included because
# the whole point of an anonymised score is that nobody downstream can tell.
FORBIDDEN = re.compile(
    r"\b("
    r"he|him|his|she|her|hers|"
    r"male|female|man|woman|men|women|guy|lady|gentleman|"
    r"young|younger|youthful|old|older|elderly|mature|age|aged|"
    r"married|single|divorced|family|children|pregnant|"
    r"nationality|national|citizen|immigrant|foreign|ethnic|ethnicity|race|"
    r"racial|religion|religious|caste|disabled|disability|photo|picture"
    r")\b",
    re.I,
)

PROMPT = """You are helping an employer read a shortlist.

Below are factual observations about ONE application that have ALREADY been
worked out. Your only task is to rewrite each "text" so it reads as a clear,
neutral, third-person note a hiring manager could skim.

Rules you must follow:
- Keep the same "id" for every item and return every item exactly once.
- Do not add, remove, merge or reorder items.
- Do not invent skills, employers, job titles, achievements or statistics.
- Do not introduce any number that is not already in the text you were given.
- Write about the application, never about the person. Never mention or imply
  gender, age, name, appearance, nationality, family or health.
- Never use "he", "she" or any other pronoun for the candidate.
- One sentence, under 30 words, no opinion about whether to hire.
{context}
Items:
{items}

Reply with a JSON array only, no other text:
[{{"id": "...", "text": "..."}}]"""


def _context_line(job: dict | None) -> str:
    """The only fact the model gets about the target, and only for tone."""
    title = str((job or {}).get("title") or "").strip()
    if not title:
        return ""
    return f'\nThe role being filled is "{title}".\n'


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+", text or ""))


def _clean(value) -> str:
    """Collapse whitespace and strip the quotes small models like to add."""
    text = " ".join(str(value or "").split())
    return text.strip('"').strip("'").strip()


def _acceptable(rewrite: dict, original: str, item_id: str) -> str | None:
    """Return the rewritten text when it is safe to show, else None."""
    text = _clean(rewrite.get("text"))

    if not (TEXT_MIN <= len(text) <= TEXT_MAX):
        return None

    # A figure that was not in the input is a figure the model made up.
    if _numbers(text) - _numbers(original):
        logger.info("Dropped rewrite for %s: invented a number", item_id)
        return None

    # A word the rules never use is the model describing the person. The
    # original is checked too, so a job skill called "Age" cannot be used to
    # smuggle the word through.
    if FORBIDDEN.search(text) and not FORBIDDEN.search(original):
        logger.warning("Dropped rewrite for %s: referenced a protected trait", item_id)
        return None

    return text


def _parse(reply: str) -> list[dict]:
    """Pull the JSON array out of a reply that may be wrapped in prose."""
    text = str(reply or "")
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end <= start:
        raise ValueError("no JSON array in reply")
    parsed = json.loads(text[start:end + 1])
    if not isinstance(parsed, list):
        raise ValueError("reply was not a list")
    return [item for item in parsed if isinstance(item, dict)]


def polish_observations(strengths: list[str], gaps: list[str],
                        job: dict | None = None) -> tuple[list[str], list[str], bool]:
    """Reword strengths and gaps. Returns (strengths, gaps, degraded).

    `degraded` is true when the model could not be reached or its reply was
    unusable — the caller surfaces that as a banner saying the score and the
    keyword lists are still accurate. Individual rewrites that fail validation
    quietly fall back to their static wording without degrading the whole
    response, because the employer still gets a sound observation.
    """
    strengths = list(strengths or [])
    gaps = list(gaps or [])

    if not strengths and not gaps:
        return strengths, gaps, False

    if not settings.resume_score_enabled:
        # The kill switch turns off the model call, not the feature. The score
        # is arithmetic and stays correct; only the prose goes back to static.
        logger.info("Applicant score LLM polish disabled by configuration")
        return strengths, gaps, True

    # Ids are positional so a reply can never move an observation from the
    # gaps column into the strengths column.
    originals: dict[str, str] = {}
    for index, text in enumerate(strengths):
        originals[f"s{index}"] = text
    for index, text in enumerate(gaps):
        originals[f"g{index}"] = text

    payload = [{"id": key, "text": value} for key, value in originals.items()]
    prompt = PROMPT.format(
        context=_context_line(job),
        items=json.dumps(payload, ensure_ascii=False, indent=1),
    )

    try:
        reply = invoke_llm(
            prompt,
            max_tokens=MAX_TOKENS,
            temperature=0.2,
            priority="interactive",
        )
        rewrites = _parse(reply)
    except ExternalServiceError as e:
        logger.warning("Applicant score wording unavailable: %s", e)
        return strengths, gaps, True
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning("Applicant score wording unparseable: %s", e)
        return strengths, gaps, True
    except Exception as e:  # noqa: BLE001 — wording must never break a score
        logger.warning("Applicant score wording failed: %s", e)
        return strengths, gaps, True

    by_id = {str(item.get("id")): item for item in rewrites}
    polished: dict[str, str] = {}
    applied = 0

    for key, original in originals.items():
        rewrite = by_id.get(key)
        text = _acceptable(rewrite, original, key) if rewrite else None
        if text:
            applied += 1
        polished[key] = text or original

    if not applied:
        # Every item was rejected, so the model contributed nothing usable.
        logger.warning("Applicant score wording all rejected by validation")
        return strengths, gaps, True

    return (
        [polished[f"s{index}"] for index in range(len(strengths))],
        [polished[f"g{index}"] for index in range(len(gaps))],
        False,
    )
