"""Job-listing chatbot: one turn in, grounded answer out.

Turn shape:

    message ──► load job (+profile) ──► trivial intent? ──► canned reply
                                    └─► model turn ──► clean ──► bubbles
                                                   └─► on failure: row-based answer

The model never decides what facts exist (that is `context.py`) and never
decides what to suggest next (that is `context.suggest_topics`). Its only job is
phrasing an answer from a context it cannot extend, which is the narrowest brief
a small model handles reliably.
"""

import json
import logging
import re
import threading
import time

import redis

from app.chat import fallback
from app.chat.context import build_context, load_job, load_profile, load_screening, suggest_topics
from app.chat.prompts import build_messages
from app.config import settings
from app.exceptions import DatabaseError, ExternalServiceError
from app.parser.llm import invoke_chat

logger = logging.getLogger(__name__)

MAX_HISTORY = 20
SESSION_TTL = 3600
MAX_SESSIONS = 10000
MAX_STORED_CHARS = 1500
MAX_BUBBLES = 3

JOB_NOT_FOUND = "Sorry, I couldn't find that job listing. It may have been removed by the employer."

# Valkey/Redis client (lazy init)
_redis_client = None
_redis_available = None

# In-memory fallback
_sessions: dict[str, dict] = {}
_sessions_lock = threading.Lock()


def _get_redis():
    """Get Redis/Valkey client. Returns None if unavailable."""
    global _redis_client, _redis_available

    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client

    if not settings.valkey_url:
        _redis_available = False
        logger.info("No VALKEY_URL configured, using in-memory sessions")
        return None

    try:
        _redis_client = redis.from_url(settings.valkey_url, decode_responses=True, socket_timeout=2)
        _redis_client.ping()
        _redis_available = True
        logger.info("Connected to Valkey session store")
        return _redis_client
    except Exception as e:
        logger.warning("Valkey unavailable, falling back to in-memory: %s", e)
        _redis_available = False
        return None


def _get_history(session_id: str) -> list[dict]:
    """Get chat history from Valkey or in-memory."""
    r = _get_redis()
    if r:
        try:
            data = r.get(f"chat:{session_id}")
            return json.loads(data) if data else []
        except Exception as e:
            logger.warning("Valkey read failed, using in-memory: %s", e)

    with _sessions_lock:
        session = _sessions.get(session_id)
        return session["messages"] if session else []


def _save_history(session_id: str, history: list[dict]):
    """Save chat history to Valkey or in-memory."""
    trimmed = [
        {"role": t["role"], "content": str(t["content"])[:MAX_STORED_CHARS]}
        for t in history[-MAX_HISTORY:]
    ]

    r = _get_redis()
    if r:
        try:
            r.setex(f"chat:{session_id}", SESSION_TTL, json.dumps(trimmed))
            return
        except Exception as e:
            logger.warning("Valkey write failed, using in-memory: %s", e)

    with _sessions_lock:
        _cleanup_sessions()
        if len(_sessions) >= MAX_SESSIONS and session_id not in _sessions:
            logger.warning("Max in-memory sessions reached (%d)", MAX_SESSIONS)
            return
        _sessions[session_id] = {"messages": trimmed, "last_access": time.time()}


def _cleanup_sessions():
    """Remove expired in-memory sessions. Called inside lock."""
    now = time.time()
    expired = [sid for sid, data in _sessions.items() if now - data["last_access"] > SESSION_TTL]
    for sid in expired:
        del _sessions[sid]


def reset_session(session_id: str) -> None:
    """Drop a conversation. Used when the user starts a fresh chat."""
    r = _get_redis()
    if r:
        try:
            r.delete(f"chat:{session_id}")
        except Exception as e:
            logger.warning("Valkey delete failed: %s", e)
    with _sessions_lock:
        _sessions.pop(session_id, None)


# ── Response hygiene ────────────────────────────

_LABEL_RE = re.compile(r"^\s*(assistant|ai|bot|candidate|user|answer|response)\s*[:\-]\s*", re.I)
_FENCE_RE = re.compile(r"```[a-z]*\n?|```", re.I)
_MARKDOWN_RE = re.compile(r"(\*\*|__|^#{1,6}\s+)", re.M)
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_PLACEHOLDER_RE = re.compile(
    r"\s*\((?:n/?a|not specified|unspecified|unknown|none)\)|"
    r"\b(?:n/?a|not specified)\b(?=[\s.,;]|$)",
    re.I,
)
_ROLE_LEAK_RE = re.compile(r"\n\s*(candidate|user|assistant)\s*:.*", re.I | re.S)


def _clean_reply(raw: str) -> str:
    """Strip the artefacts a small instruct model leaks into a chat answer.

    Each substitution here corresponds to something observed in real output:
    a leading `Assistant:` label, a fenced code block wrapping prose, markdown
    headings the chat bubble renders literally, an invented `http://…/jobs/…`
    link, or the model continuing the transcript with the candidate's next line.
    """
    text = str(raw or "").strip()
    text = _FENCE_RE.sub("", text)
    text = _ROLE_LEAK_RE.sub("", text)
    text = _LABEL_RE.sub("", text)
    text = _MARKDOWN_RE.sub("", text)
    text = _URL_RE.sub("", text)
    text = _PLACEHOLDER_RE.sub("", text)
    # Removing a URL or placeholder mid-sentence leaves the space before the
    # full stop behind.
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(" \n\t-–—")


_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'“])")


def _to_bubbles(text: str) -> list[str]:
    """Split one answer into chat bubbles.

    The old prompt asked the model for a JSON array of bubbles. It is a
    presentation decision with a deterministic answer, so it does not belong in
    the model's output contract — splitting here means the bubbles are always
    well formed even when the model writes one long paragraph.
    """
    if not text:
        return []

    # Explicit paragraph or list structure from the model wins over sentence
    # splitting: breaking a bulleted skill list mid-list reads as broken.
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    if len(blocks) > 1:
        return blocks[:MAX_BUBBLES]

    if "\n- " in text or text.lstrip().startswith("- "):
        return [text]

    sentences = [s.strip() for s in _SENTENCE_RE.split(text) if s.strip()]
    if len(sentences) <= 1:
        return [text]

    # Two sentences per bubble keeps them substantial rather than staccato.
    bubbles = [
        " ".join(sentences[i:i + 2]) for i in range(0, len(sentences), 2)
    ]
    if len(bubbles) <= MAX_BUBBLES:
        return bubbles
    # Fold the overflow into the last allowed bubble instead of dropping it.
    head = bubbles[: MAX_BUBBLES - 1]
    head.append(" ".join(bubbles[MAX_BUBBLES - 1:]))
    return head


# ── Turn ────────────────────────────────────────


def chat(job_id: str, message: str, session_id: str, user_id: str = None) -> dict:
    """Handle one chat message. Always returns {response, messages, suggestions}."""
    job = load_job(job_id)
    if not job:
        return {"response": JOB_NOT_FOUND, "messages": [JOB_NOT_FOUND], "suggestions": []}

    profile = load_profile(user_id) if user_id else None
    ctx = build_context(job, profile, load_screening(job_id))

    history = _get_history(session_id)

    # Greetings, thanks and "how do I apply" have one correct answer each. They
    # do not need the model, and routing them to it wasted an interactive slot.
    intent = fallback.detect_intent(message)
    canned = fallback.canned_reply(ctx, intent)
    if canned:
        return _finish(ctx, session_id, history, message, canned, degraded=False)

    messages = build_messages(ctx, history[-settings.chat_history_turns * 2:], message)

    try:
        raw = invoke_chat(
            messages,
            max_tokens=settings.chat_max_tokens,
            temperature=settings.chat_temperature,
            priority="interactive",
            timeout_seconds=settings.chat_llm_timeout_seconds,
        )
        answer = _clean_reply(raw)
    except (ExternalServiceError, DatabaseError) as e:
        # Phase 3: a model outage must not become a dead chat window. The job row
        # is already in hand, so answer from it and say nothing about the outage.
        logger.warning("Chat LLM unavailable (%s), answering from job data", e)
        answer = ""

    if not answer:
        answer = fallback.fallback_reply(ctx, message)
        degraded = True
    else:
        degraded = False

    return _finish(ctx, session_id, history, message, answer, degraded)


def _finish(ctx, session_id: str, history: list[dict], message: str,
            answer: str, degraded: bool) -> dict:
    bubbles = _to_bubbles(answer) or [answer]

    history = history + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": answer},
    ]
    _save_history(session_id, history)

    # Suggestions are chosen from what the context can actually answer, minus
    # whatever this conversation has already covered.
    discussed = " ".join(turn["content"] for turn in history[-8:])
    suggestions = suggest_topics(ctx, discussed)

    return {
        "response": answer,
        "messages": bubbles,
        "suggestions": suggestions,
        "degraded": degraded,
    }
