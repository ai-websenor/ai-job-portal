"""Friendlier wording for improvement cards the rules already decided on.

The model's entire job here is rephrasing. It is never asked what is wrong, how
many points anything is worth, or what the candidate should add - `rules.py`
settled all of that before this module is called. That separation is what makes
an outage a cosmetic problem: the static wording below ships instead, the score
is unchanged, and the response carries `degraded: true`.

Every rewrite is checked before it is used:

* it has to belong to a card we sent (no invented `id`s),
* it has to be a sane length,
* and it may not introduce a number that was not in the original.

The last one matters most. "Add Docker, which appears in 73% of similar jobs"
is the kind of sentence a small model produces happily and we have no data to
support. A rewrite that invents a figure is dropped and its static original is
used instead.
"""

import json
import logging
import re

from app.config import settings
from app.exceptions import ExternalServiceError
from app.parser.llm import invoke_llm

logger = logging.getLogger(__name__)

TITLE_MIN, TITLE_MAX = 3, 70
DESCRIPTION_MIN, DESCRIPTION_MAX = 20, 260

# Enough for six cards of two short sentences each, with headroom for the JSON
# scaffolding. Anything longer is the model rambling rather than rewriting.
MAX_TOKENS = 700

PROMPT = """You are helping a job seeker improve their profile on a job board.

Below is a list of issues that have ALREADY been identified. Your only task is
to rewrite each "title" and "description" so it sounds warm, direct and
encouraging, as a helpful careers adviser would say it.

Rules you must follow:
- Keep the same "id" for every item and return every item exactly once.
- Do not add, remove, merge or reorder items.
- Do not invent skills, employers, job titles, achievements or statistics.
- Do not introduce any number that is not already in the text you were given.
- Title: under 8 words, no full stop.
- Description: one or two sentences, under 40 words, addressed to "you".
{context}
Items:
{items}

Reply with a JSON array only, no other text:
[{{"id": "...", "title": "...", "description": "..."}}]"""


def _context_line(job: dict | None) -> str:
    """The only fact the model gets about the target, and only for tone."""
    title = str((job or {}).get("title") or "").strip()
    if not title:
        return ""
    return f'\nThe job they are aiming for is "{title}".\n'


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+", text or ""))


def _clean(value) -> str:
    """Collapse whitespace and strip the quotes small models like to add."""
    text = " ".join(str(value or "").split())
    return text.strip('"').strip("'").strip()


def _acceptable(rewrite: dict, original: dict) -> tuple[str, str] | None:
    """Return (title, description) when a rewrite is safe to show, else None."""
    title = _clean(rewrite.get("title"))
    description = _clean(rewrite.get("description"))

    if not (TITLE_MIN <= len(title) <= TITLE_MAX):
        return None
    if not (DESCRIPTION_MIN <= len(description) <= DESCRIPTION_MAX):
        return None

    # A figure that was not in the input is a figure the model made up.
    allowed = _numbers(original["title"]) | _numbers(original["description"])
    if (_numbers(title) | _numbers(description)) - allowed:
        logger.info("Dropped rewrite for %s: invented a number", original["id"])
        return None

    return title, description


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


def polish_improvements(improvements: list[dict],
                        job: dict | None = None) -> tuple[list[dict], bool]:
    """Rewrite card wording. Returns (improvements, degraded).

    `degraded` is true when the model could not be reached or its reply was
    unusable - the caller surfaces that as a banner saying the score and the
    missing keywords are still accurate. Individual rewrites that fail
    validation quietly fall back to their static wording without degrading the
    whole response, because the candidate still gets sound advice.
    """
    if not improvements:
        return improvements, False

    if not settings.resume_score_enabled:
        # The kill switch turns off the model call, not the feature. The score
        # is arithmetic and stays correct; only the prose goes back to static.
        logger.info("Resume score LLM polish disabled by configuration")
        return improvements, True

    payload = [
        {"id": item["id"], "title": item["title"], "description": item["description"]}
        for item in improvements
    ]
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
        logger.warning("Resume score suggestions unavailable: %s", e)
        return improvements, True
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning("Resume score suggestions unparseable: %s", e)
        return improvements, True
    except Exception as e:  # noqa: BLE001 - wording must never break a score
        logger.warning("Resume score suggestions failed: %s", e)
        return improvements, True

    by_id = {str(item.get("id")): item for item in rewrites}
    polished: list[dict] = []
    applied = 0

    for original in improvements:
        card = dict(original)
        rewrite = by_id.get(original["id"])
        if rewrite:
            checked = _acceptable(rewrite, original)
            if checked:
                card["title"], card["description"] = checked
                applied += 1
        polished.append(card)

    if not applied:
        # Every item was rejected, so the model contributed nothing usable.
        logger.warning("Resume score suggestions all rejected by validation")
        return improvements, True

    return polished, False
