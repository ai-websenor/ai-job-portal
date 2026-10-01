"""Answers built from the job row alone, with no model in the loop.

This exists for two jobs:

* **Short-circuit.** "hi", "thanks", "who are you" do not need a GPU. Sending
  them to the model costs a slot in a two-wide interactive pool and, on a small
  model, frequently produced a paragraph about the job description instead of a
  greeting.
* **Fallback.** When the model is down, overloaded or timing out, a candidate
  asking "what's the salary?" should get the salary — which is sitting in the
  row we already loaded — rather than a 503. The reply is plainer than a
  generated one, but it is correct, instant, and always available.

Everything here reads from `ChatContext.values`, so a fallback answer can never
contain a fact the grounded context does not have.
"""

import re

from app.chat.context import ChatContext, TOPICS, TOPIC_KEYWORDS

GREETING = "greeting"
THANKS = "thanks"
FAREWELL = "farewell"
IDENTITY = "identity"
APPLY = "apply"
QUESTION = "question"

_GREETING_RE = re.compile(
    r"^(hi|hii+|hey+|hello+|yo|hola|namaste|good\s*(morning|afternoon|evening|day))"
    r"[\s!.,?]*$",
    re.I,
)
_THANKS_RE = re.compile(r"^(thanks?|thank\s*you|thx|ty|great|awesome|nice|ok(ay)?|cool|got it)[\s!.,]*$", re.I)
_FAREWELL_RE = re.compile(r"^(bye+|goodbye|see\s*you|cya|good\s*night)[\s!.,]*$", re.I)
_IDENTITY_RE = re.compile(r"\b(who are you|what are you|are you (a )?(bot|human|ai|robot)|your name)\b", re.I)
_APPLY_RE = re.compile(r"\b(how (do|can) i apply|where.{0,15}apply|apply for this|submit.{0,15}application)\b", re.I)


def detect_intent(message: str) -> str:
    """Classify a message that can be handled without the model."""
    text = message.strip()
    if _GREETING_RE.match(text):
        return GREETING
    if _THANKS_RE.match(text):
        return THANKS
    if _FAREWELL_RE.match(text):
        return FAREWELL
    if _IDENTITY_RE.search(text):
        return IDENTITY
    if _APPLY_RE.search(text):
        return APPLY
    return QUESTION


def canned_reply(ctx: ChatContext, intent: str) -> str | None:
    """Reply for a non-question intent, or None if the model should handle it."""
    name = f" {ctx.candidate_name}" if ctx.candidate_name else ""
    role = ctx.job_title or "this role"

    if intent == GREETING:
        return (
            f"Hi{name}! I can answer questions about the {role} opening"
            f"{f' at {ctx.company_name}' if ctx.company_name else ''}. "
            f"Ask me anything about the role, the requirements or the company."
        )
    if intent == THANKS:
        return "Happy to help. Anything else you'd like to know about this role?"
    if intent == FAREWELL:
        return "All the best with your search — good luck with the application!"
    if intent == IDENTITY:
        return (
            f"I'm the hiring assistant for this listing. I only know what's in the "
            f"{role} posting{f' from {ctx.company_name}' if ctx.company_name else ''}, "
            f"so I can help with the role, requirements, and the company."
        )
    if intent == APPLY:
        if not ctx.is_open:
            return (
                "This listing is closed, so applications aren't being accepted any more. "
                "You can still browse similar openings on the job board."
            )
        return (
            "You can apply straight from this page using the Apply button. "
            "I can't submit it for you, but I'm happy to help you check whether "
            "the role is a fit first."
        )
    return None


# ── Deterministic topic answers ─────────────────

_TOPIC_TEMPLATES: dict[str, str] = {
    "salary": "The listed salary for this role is {value}.",
    "location": "This role is based in {value}.",
    "work_mode": "The work mode for this role is {value}.",
    "job_type": "This is a {value} position.",
    "experience": "The listing asks for {value} of experience.",
    "skills": "The required skills are: {value}.",
    "deadline": "Applications close on {value}.",
    "travel": "On travel, the listing says: {value}",
    "immigration": "On work authorisation, the listing says: {value}",
    "qualification": "The qualifications asked for are: {value}",
    "certification": "On certifications, the listing says: {value}",
    "benefits": "The benefits listed are: {value}",
    "culture": "On culture, {company} says: {value}",
    "industry": "{company} works in {value}.",
    "company_size": "{company} is a {value} company.",
    "company": "About {company}: {value}",
    "responsibilities": "Here's what the role involves: {value}",
    "screening": "When you apply you'll be asked: {value}",
}

# The description is long; a fallback answer quoting all of it is unreadable.
_ANSWER_CHAR_LIMIT = 420


def match_topics(message: str) -> list[str]:
    """Topic keys the message appears to be asking about, best guess first."""
    text = message.lower()
    hits: list[tuple[int, str]] = []
    for topic in TOPICS:
        for word in TOPIC_KEYWORDS.get(topic.key, ()):
            if word in text:
                # Longer keyword matches are more specific, so they rank higher.
                hits.append((len(word), topic.key))
                break
    hits.sort(reverse=True)
    seen: set[str] = set()
    ordered = []
    for _, key in hits:
        if key not in seen:
            seen.add(key)
            ordered.append(key)
    return ordered


def _shorten(value: str) -> str:
    single_line = " ".join(value.split())
    if len(single_line) <= _ANSWER_CHAR_LIMIT:
        return single_line
    cut = single_line[:_ANSWER_CHAR_LIMIT]
    index = cut.rfind(". ")
    if index > _ANSWER_CHAR_LIMIT * 0.5:
        return cut[: index + 1]
    return cut.rsplit(" ", 1)[0] + " …"


def deterministic_answer(ctx: ChatContext, message: str) -> str | None:
    """Answer purely from the job row, or None if the row can't answer it."""
    company = ctx.company_name or "the company"

    for key in match_topics(message):
        if key in ("fit", "gaps"):
            answer = _fit_answer(ctx, key)
            if answer:
                return answer
            continue
        value = ctx.values.get(key)
        if value:
            template = _TOPIC_TEMPLATES.get(key)
            if template:
                return template.format(value=_shorten(value), company=company)
    return None


def _fit_answer(ctx: ChatContext, key: str) -> str | None:
    """Compare the candidate's listed skills against the job's, by name."""
    if not ctx.candidate_skills or not ctx.job_skills:
        return None

    have = {s.lower() for s in ctx.candidate_skills}
    matched = [s for s in ctx.job_skills if s.lower() in have]
    missing = [s for s in ctx.job_skills if s.lower() not in have]

    if key == "gaps":
        if not missing:
            return (
                "Going by your profile, you already list every skill this role asks for."
            )
        return (
            f"Compared with your profile, the skills not yet listed on it are: "
            f"{', '.join(missing[:8])}."
        )

    if matched:
        return (
            f"Your profile lists {len(matched)} of the {len(ctx.job_skills)} skills "
            f"this role asks for — {', '.join(matched[:6])}."
            + (f" Not yet listed: {', '.join(missing[:5])}." if missing else "")
        )
    return (
        f"Your profile doesn't currently list the skills this role asks for "
        f"({', '.join(ctx.job_skills[:6])}). Adding any you do have would help."
    )


_OFFER_LABELS = {
    "skills": "the required skills",
    "experience": "the experience needed",
    "salary": "the salary range",
    "location": "the location",
    "work_mode": "the work mode",
    "benefits": "the benefits",
}


def unknown_topic_reply(ctx: ChatContext) -> str:
    """Honest 'not in the listing' answer that still offers something useful."""
    offer = [label for key, label in _OFFER_LABELS.items() if key in ctx.values][:3]

    base = "This listing doesn't mention that."
    if not offer:
        return f"{base} I only have what the employer published on this job page."
    if len(offer) == 1:
        return f"{base} I can tell you about {offer[0]} if that helps."
    return f"{base} I can tell you about {', '.join(offer[:-1])} or {offer[-1]} if that helps."


def fallback_reply(ctx: ChatContext, message: str) -> str:
    """Best available answer with no model. Never returns empty."""
    intent = detect_intent(message)
    canned = canned_reply(ctx, intent)
    if canned:
        return canned

    answer = deterministic_answer(ctx, message)
    if answer:
        return answer

    return unknown_topic_reply(ctx)
