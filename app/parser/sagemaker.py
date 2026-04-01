import json
import logging
import random
import threading
import time

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError, ReadTimeoutError

from app.config import settings
from app.models.resume import ResumeOutput
from app.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)

# ── Singleton SageMaker client (thread-safe) ──────────────────────────
_client = None
_client_lock = threading.Lock()


def _get_client():
    """Lazy singleton boto3 SageMaker runtime client."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                kwargs = {"region_name": settings.aws_region}
                if settings.aws_profile:
                    kwargs["profile_name"] = settings.aws_profile
                session = boto3.Session(**kwargs)
                _client = session.client(
                    "sagemaker-runtime",
                    config=Config(
                        read_timeout=120,
                        connect_timeout=10,
                        retries={"max_attempts": 1},
                    ),
                )
                logger.info("SageMaker client initialized (region=%s)", settings.aws_region)
    return _client


# ── Two-pool semaphore: parse vs interactive ──────────────────────────
_parse_sem = threading.Semaphore(settings.sagemaker_parse_concurrency)
_interactive_sem = threading.Semaphore(settings.sagemaker_interactive_concurrency)

MAX_RETRIES = 3
BASE_BACKOFF = 2.0


def invoke_llm(prompt: str, max_tokens: int = 4096, temperature: float = 0.1,
               priority: str = "parse") -> str:
    """Send prompt to Ministral 14B via streaming, return raw text.

    priority: "parse" uses parse semaphore pool, "interactive" uses reserved pool.
    Retries up to 3 times on ThrottlingException with exponential backoff.
    Raises ExternalServiceError on timeout/throttle/connection failures.
    """
    sem = _interactive_sem if priority == "interactive" else _parse_sem
    timeout = 30 if priority == "interactive" else 120

    acquired = sem.acquire(timeout=timeout)
    if not acquired:
        logger.warning("Semaphore timeout (%s pool, %ds)", priority, timeout)
        raise ExternalServiceError("AI service overloaded, try again later")

    try:
        return _invoke_with_retry(prompt, max_tokens, temperature, priority)
    finally:
        sem.release()


def _invoke_with_retry(prompt: str, max_tokens: int, temperature: float,
                       priority: str) -> str:
    """Invoke LLM with retry + exponential backoff on throttle."""
    logger.info("invoke_llm [%s]: prompt=%d chars, max_tokens=%d, temp=%.2f",
                priority, len(prompt), max_tokens, temperature)

    for attempt in range(MAX_RETRIES + 1):
        try:
            return _do_invoke(prompt, max_tokens, temperature)
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "ThrottlingException" and attempt < MAX_RETRIES:
                backoff = BASE_BACKOFF * (2 ** attempt) + random.uniform(0, 1)
                logger.warning("SageMaker throttled, retry %d/%d in %.1fs",
                               attempt + 1, MAX_RETRIES, backoff)
                time.sleep(backoff)
                continue
            if code == "ThrottlingException":
                logger.warning("SageMaker throttled, all %d retries exhausted", MAX_RETRIES)
                raise ExternalServiceError("AI service busy, try again shortly") from e
            if code in ("ModelNotReadyException", "ServiceUnavailable"):
                logger.error("SageMaker endpoint not ready: %s", code)
                raise ExternalServiceError("AI service starting up, try again in a minute") from e
            logger.error("SageMaker invoke error [%s]: %s", code, e)
            raise ExternalServiceError("AI service error") from e
        except (BotoCoreError, ReadTimeoutError) as e:
            logger.error("SageMaker connection/timeout: %s", e)
            raise ExternalServiceError("AI service timeout") from e

    raise ExternalServiceError("AI service error after retries")


def _do_invoke(prompt: str, max_tokens: int, temperature: float) -> str:
    """Single SageMaker invoke call with streaming response collection."""
    client = _get_client()

    payload = {
        "inputs": f"<s>[INST] {prompt} [/INST]",
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": temperature,
            "do_sample": temperature > 0,
            "return_full_text": False,
        },
    }

    response = client.invoke_endpoint_with_response_stream(
        EndpointName=settings.sagemaker_endpoint_name,
        ContentType="application/json",
        Body=json.dumps(payload),
    )

    # Collect streamed chunks
    full_text = ""
    try:
        for event in response["Body"]:
            chunk = event.get("PayloadPart", {}).get("Bytes", b"")
            if chunk:
                full_text += chunk.decode("utf-8")
    except Exception as e:
        logger.error("SageMaker stream read error after %d chars: %s", len(full_text), e)
        if not full_text:
            raise ExternalServiceError("AI service stream failed") from e
        logger.warning("Using partial SageMaker response (%d chars)", len(full_text))

    if not full_text.strip():
        logger.error("SageMaker returned empty response")
        raise ExternalServiceError("AI service returned empty response")

    logger.info("invoke_llm: raw response %d chars, first 200: %.200s", len(full_text), full_text)

    # DJL/vLLM returns JSON array; extract generated_text
    try:
        result = json.loads(full_text)
        if isinstance(result, list) and result:
            generated = result[0].get("generated_text", full_text)
            logger.info("invoke_llm: extracted generated_text %d chars", len(generated))
            return generated
    except json.JSONDecodeError:
        logger.info("invoke_llm: response is not JSON array, returning raw text")
    return full_text


# ── invoke_mistral wrapper (used by main.py, removed in Phase 3) ─────

def invoke_mistral(resume_text: str, log_fn=None, progress_fn=None) -> ResumeOutput:
    """Parse resume using per-section chunked processing (N parallel LLM calls).

    log_fn: optional callback log_fn(message, level="info") for live status.
    progress_fn: optional callback progress_fn(chunks_done, chunks_total) for progress.
    """
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


# ── Legacy helpers (used by chunked_processor for JSON parsing) ───────

def _is_empty_result(result: ResumeOutput) -> bool:
    """Check if parsed result has no meaningful data."""
    return not result.personal.name.value and not result.experience and not result.skills


def _parse_response(text: str, attempt: int = 0) -> ResumeOutput:
    """Parse LLM JSON response into ResumeOutput. Logs warnings on failures."""
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
        logger.warning("No JSON found in LLM response (%d chars): %.200s...", len(text), text)
        return ResumeOutput()

    json_str = cleaned[start:end]
    try:
        data = json.loads(json_str)
        return ResumeOutput(**data)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed (attempt %d): %s | text: %.200s...", attempt, e, json_str)
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
        if json_str[i] in ('}', ']'):
            candidate = json_str[:i + 1]
            open_braces = candidate.count('{') - candidate.count('}')
            open_brackets = candidate.count('[') - candidate.count(']')
            if open_braces >= 0 and open_brackets >= 0:
                candidate += ']' * open_brackets + '}' * open_braces
                try:
                    data = json.loads(candidate)
                    logger.info("Repaired truncated JSON (removed %d trailing chars)", len(json_str) - i - 1)
                    return ResumeOutput(**data)
                except (json.JSONDecodeError, Exception):
                    continue
    return None
