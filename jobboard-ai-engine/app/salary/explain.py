"""The one plain-English sentence under the salary range.

Strictly decorative. Every figure the employer sees is computed in
`app.salary.estimator` from real postings; this module only puts a sentence
around them, and the model is explicitly forbidden from emitting digits.

That prohibition is enforced, not merely requested: a reply containing any
digit is thrown away. A 3B model that starts quoting salaries it invented is
the single worst failure this feature could have, and the honest alternative —
no sentence at all — costs nothing.
"""

from __future__ import annotations

import logging

from app.parser.llm import invoke_llm

logger = logging.getLogger(__name__)

MAX_SENTENCE_CHARS = 220
MIN_SENTENCE_CHARS = 15


def _build_prompt(
    role_label: str,
    city: str | None,
    exp_min: float | None,
    exp_max: float | None,
    sample_size: int,
    confidence: str,
) -> str:
    where = city.title() if city else "across the country"

    if exp_min is not None and exp_max is not None:
        experience = f"{_years(exp_min)} to {_years(exp_max)} years of experience"
    elif exp_min is not None:
        experience = f"{_years(exp_min)} years of experience or more"
    elif exp_max is not None:
        experience = f"up to {_years(exp_max)} years of experience"
    else:
        experience = "any level of experience"

    return (
        "You are helping an employer understand a market salary estimate for a "
        "job they are about to advertise.\n\n"
        f"Role: {role_label}\n"
        f"Market: {where}\n"
        f"Experience asked for: {experience}\n"
        f"Confidence in the estimate: {confidence}\n\n"
        "Write ONE short sentence, at most 25 words, telling the employer what "
        "this range represents.\n"
        "Rules:\n"
        "- Do NOT write any numbers, digits, figures, percentages or currency "
        "amounts. The numbers are shown separately.\n"
        "- Call it a market estimate based on similar live job adverts. Never "
        "promise what anyone will be paid.\n"
        "- Reply with the sentence only, no preamble and no quotation marks."
    )


def _years(value: float) -> str:
    """Render a year count without a pointless trailing .0."""
    number = float(value)
    return str(int(number)) if number.is_integer() else str(number)


def _clean(reply: str) -> str | None:
    """Trim the model's reply to one usable sentence, or reject it."""
    text = " ".join(str(reply or "").strip().split())
    if not text:
        return None

    # Small models prefix answers with "Sentence:" / "Answer:".
    for prefix in ("sentence:", "answer:", "output:", "response:"):
        if text.lower().startswith(prefix):
            text = text[len(prefix):].strip()

    text = text.strip("\"'`").strip()

    # First sentence only — anything after it is usually the model explaining
    # itself, which the employer does not need.
    for stop in (". ", "? ", "! "):
        index = text.find(stop)
        if index != -1:
            text = text[: index + 1]
            break

    text = text.strip()
    if not text:
        return None

    # The hard rule: the model contributes no figures whatsoever.
    if any(ch.isdigit() for ch in text):
        logger.info("Dropping salary explanation containing digits: %r", text)
        return None

    if len(text) < MIN_SENTENCE_CHARS or len(text) > MAX_SENTENCE_CHARS:
        return None

    if not text.endswith((".", "!", "?")):
        text += "."

    return text


def explain_estimate(
    role_label: str,
    city: str | None = None,
    exp_min: float | None = None,
    exp_max: float | None = None,
    sample_size: int = 0,
    confidence: str = "medium",
) -> str | None:
    """One sentence describing the estimate, or None if the model cannot help.

    Raises `ExternalServiceError` when the model is unreachable; the estimator
    catches that and returns the range with `degraded: true`.
    """
    reply = invoke_llm(
        _build_prompt(role_label, city, exp_min, exp_max, sample_size, confidence),
        max_tokens=80,
        temperature=0.1,
        priority="interactive",
    )
    return _clean(reply)
