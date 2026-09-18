import json
import logging
import random
import threading
import time
from typing import Any

import httpx

from app.config import settings
from app.exceptions import ExternalServiceError
from app.models.resume import ResumeOutput

logger = logging.getLogger(__name__)

_client: httpx.Client | None = None
_client_lock = threading.Lock()

_parse_sem = threading.Semaphore(settings.llm_parse_concurrency or settings.sagemaker_parse_concurrency)
_interactive_sem = threading.Semaphore(
    settings.llm_interactive_concurrency or settings.sagemaker_interactive_concurrency
)

MAX_RETRIES = 3
BASE_BACKOFF = 2.0


class _RetryableLLMError(Exception):
    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"retryable LLM status {status_code}")


def _dev_log(level: str, event: str, **fields: Any) -> None:
    if settings.app_env.lower() in {"production", "prod"}:
        return
    message = json.dumps({"event": event, **fields}, sort_keys=True)
    getattr(logger, level)(message)


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                headers = {"Content-Type": "application/json"}
                if settings.llm_api_key:
                    headers["Authorization"] = f"Bearer {settings.llm_api_key}"

                _client = httpx.Client(
                    base_url=settings.llm_base_url.rstrip("/"),
                    headers=headers,
                    timeout=httpx.Timeout(
                        settings.llm_read_timeout_seconds,
                        connect=settings.llm_connect_timeout_seconds,
                    ),
                )
                logger.info("LLM HTTP client initialized (base_url=%s model=%s)",
                            settings.llm_base_url, settings.llm_model)
    return _client


def invoke_llm(prompt: str, max_tokens: int = 4096, temperature: float = 0.1,
               priority: str = "parse") -> str:
    """Send a single-turn prompt to the configured OpenAI-compatible endpoint."""
    return invoke_chat(
        [{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
        priority=priority,
    )


def invoke_chat(messages: list[dict], max_tokens: int = 1024, temperature: float = 0.2,
                priority: str = "interactive", extra: dict | None = None,
                timeout_seconds: float | None = None) -> str:
    """Send a role-separated message list to the LLM.

    Instruct-tuned models apply their chat template to the roles, so a real
    system/user/assistant list keeps instructions structurally separated from
    the transcript. Flattening the same content into one user turn makes the
    model continue the transcript instead of answering it.
    """
    sem = _interactive_sem if priority == "interactive" else _parse_sem
    wait = (
        settings.llm_interactive_semaphore_wait_seconds
        if priority == "interactive"
        else settings.llm_semaphore_wait_seconds
    )

    acquired = sem.acquire(timeout=wait)
    if not acquired:
        logger.warning("LLM semaphore timeout (%s pool, %ds)", priority, wait)
        raise ExternalServiceError("AI service overloaded, try again later")

    try:
        return _invoke_with_retry(messages, max_tokens, temperature, priority,
                                  extra, timeout_seconds)
    finally:
        sem.release()


def _invoke_with_retry(messages: list[dict], max_tokens: int, temperature: float,
                       priority: str, extra: dict | None = None,
                       timeout_seconds: float | None = None) -> str:
    _dev_log(
        "info",
        "llm_request_start",
        priority=priority,
        prompt_chars=sum(len(str(m.get("content", ""))) for m in messages),
        turns=len(messages),
        max_tokens=max_tokens,
        temperature=temperature,
    )

    # Interactive callers sit behind a 30s HTTP client; burning the full retry
    # ladder there just guarantees the caller has already given up.
    max_retries = 1 if priority == "interactive" else MAX_RETRIES

    for attempt in range(max_retries + 1):
        try:
            return _do_invoke(messages, max_tokens, temperature, priority, attempt,
                              extra, timeout_seconds)
        except _RetryableLLMError as e:
            if attempt < max_retries:
                backoff = BASE_BACKOFF * (2 ** attempt) + random.uniform(0, 1)
                logger.warning("LLM returned %d, retry %d/%d in %.1fs",
                               e.status_code, attempt + 1, max_retries, backoff)
                time.sleep(backoff)
                continue
            if e.status_code == 429:
                raise ExternalServiceError("AI service busy, try again shortly") from e
            if e.status_code == 504:
                raise ExternalServiceError("AI service timeout") from e
            raise ExternalServiceError("AI service starting up, try again in a minute") from e
        except httpx.TimeoutException as e:
            logger.error("LLM timeout: %s", e)
            raise ExternalServiceError("AI service timeout") from e
        except httpx.RequestError as e:
            logger.error("LLM connection error: %s", e)
            raise ExternalServiceError("AI service unavailable") from e

    raise ExternalServiceError("AI service error after retries")


def _do_invoke(messages: list[dict], max_tokens: int, temperature: float,
               priority: str, attempt: int, extra: dict | None = None,
               timeout_seconds: float | None = None) -> str:
    client = _get_client()
    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }
    if extra:
        payload.update(extra)

    request_kwargs = {}
    if timeout_seconds is not None:
        # The shared client is tuned for 10-minute parse calls. A chat turn that
        # takes that long is already a failed turn as far as the user is concerned.
        request_kwargs["timeout"] = httpx.Timeout(
            timeout_seconds, connect=settings.llm_connect_timeout_seconds
        )

    started = time.perf_counter()
    response = client.post("chat/completions", json=payload, **request_kwargs)
    duration_ms = int((time.perf_counter() - started) * 1000)

    _dev_log(
        "info",
        "llm_request_finish",
        priority=priority,
        attempt=attempt,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )

    if response.status_code in {429, 502, 503, 504}:
        raise _RetryableLLMError(response.status_code)
    if response.status_code >= 400:
        logger.error("LLM request failed with status %d", response.status_code)
        raise ExternalServiceError("AI service error")

    full_text = _extract_generated_text(response)
    if not full_text.strip():
        logger.error("LLM returned empty response")
        raise ExternalServiceError("AI service returned empty response")

    logger.info("invoke_llm: response received (%d chars)", len(full_text))
    return full_text


def _extract_generated_text(response: httpx.Response) -> str:
    try:
        data = response.json()
    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON response")
        raise ExternalServiceError("AI service returned invalid response") from e

    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        message = first.get("message") if isinstance(first, dict) else None
        if isinstance(message, dict) and isinstance(message.get("content"), str):
            return message["content"]
        if isinstance(first, dict) and isinstance(first.get("text"), str):
            return first["text"]

    if isinstance(data.get("generated_text"), str):
        return data["generated_text"]

    logger.error("LLM response missing generated text")
    raise ExternalServiceError("AI service returned invalid response")


def invoke_mistral(resume_text: str, log_fn=None, progress_fn=None) -> ResumeOutput:
    """Parse resume using per-section chunked processing."""
    import asyncio
    from app.parser.chunked_processor import process_chunked

    def _log(msg, level="info"):
        if log_fn:
            log_fn(msg, level)
        logger.info(msg)

    _log(f"Starting chunked processing ({len(resume_text)} chars)")
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(process_chunked(resume_text, log_fn, progress_fn))
    finally:
        loop.close()


def invoke_mistral_raw(pages: list[str], log_fn=None, progress_fn=None) -> ResumeOutput:
    """Parse resume using raw per-page processing."""
    import asyncio
    from app.parser.chunked_processor import process_raw

    def _log(msg, level="info"):
        if log_fn:
            log_fn(msg, level)
        logger.info(msg)

    _log(f"Starting raw processing ({len(pages)} pages)")
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(process_raw(pages, log_fn, progress_fn))
    finally:
        loop.close()


def invoke_mistral_whole(text: str, log_fn=None, progress_fn=None) -> ResumeOutput:
    """Parse resume using single whole-document LLM call."""
    import asyncio
    from app.parser.chunked_processor import process_whole

    def _log(msg, level="info"):
        if log_fn:
            log_fn(msg, level)
        logger.info(msg)

    _log(f"Starting whole-document processing ({len(text)} chars)")
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(process_whole(text, log_fn, progress_fn))
    finally:
        loop.close()


def _is_empty_result(result: ResumeOutput) -> bool:
    has_personal = bool(
        result.personalDetails.firstName
        or result.personalDetails.headline
        or result.personalDetails.professionalSummary
    )
    return not has_personal and not result.experienceDetails and not result.skills


def _parse_response(text: str, attempt: int = 0) -> ResumeOutput:
    """Parse LLM JSON response into ResumeOutput."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start == -1 or end == 0:
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        if start != -1:
            repaired = _repair_truncated_json(cleaned[start:])
            if repaired:
                return repaired
        logger.warning("No JSON found in LLM response (%d chars)", len(text))
        return ResumeOutput()

    json_str = cleaned[start:end]
    try:
        data = json.loads(json_str)
        return ResumeOutput(**data)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed (attempt %d): %s", attempt, e)
        repaired = _repair_truncated_json(json_str)
        if repaired:
            return repaired
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        return ResumeOutput()
    except Exception as e:
        logger.warning("ResumeOutput validation failed (attempt %d): %s", attempt, e)
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        return ResumeOutput()


def _repair_truncated_json(json_str: str) -> ResumeOutput | None:
    """Fix JSON truncated by max_tokens cutoff."""
    for i in range(len(json_str) - 1, max(len(json_str) - 1000, 0), -1):
        if json_str[i] in ("}", "]"):
            candidate = json_str[:i + 1]
            open_braces = candidate.count("{") - candidate.count("}")
            open_brackets = candidate.count("[") - candidate.count("]")
            if open_braces >= 0 and open_brackets >= 0:
                candidate += "]" * open_brackets + "}" * open_braces
                try:
                    data = json.loads(candidate)
                    logger.info("Repaired truncated JSON (removed %d trailing chars)", len(json_str) - i - 1)
                    return ResumeOutput(**data)
                except (json.JSONDecodeError, Exception):
                    continue
    return None
