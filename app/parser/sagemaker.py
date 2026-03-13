import asyncio
import json
import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError, ReadTimeoutError
from app.config import settings
from app.parser.prompt import build_prompt
from app.parser.token_estimator import estimate_output_tokens, needs_chunking
from app.models.resume import ResumeOutput
from app.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


def get_sagemaker_client():
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_profile:
        kwargs["profile_name"] = settings.aws_profile
    session = boto3.Session(**kwargs)
    return session.client(
        "sagemaker-runtime",
        config=Config(
            read_timeout=120,
            connect_timeout=10,
            retries={"max_attempts": 1},
        ),
    )


def invoke_llm(prompt: str, max_tokens: int = 4096, temperature: float = 0.1) -> str:
    """Send prompt to Ministral 14B via streaming, return raw text.

    Raises ExternalServiceError on timeout/throttle/connection failures.
    """
    logger.info("invoke_llm: prompt=%d chars, max_tokens=%d, temp=%.2f", len(prompt), max_tokens, temperature)
    client = get_sagemaker_client()

    payload = {
        "inputs": f"<s>[INST] {prompt} [/INST]",
        "parameters": {
            "max_new_tokens": max_tokens,
            "temperature": temperature,
            "do_sample": temperature > 0,
            "return_full_text": False,
        },
    }

    try:
        response = client.invoke_endpoint_with_response_stream(
            EndpointName=settings.sagemaker_endpoint_name,
            ContentType="application/json",
            Body=json.dumps(payload),
        )
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "ThrottlingException":
            logger.warning("SageMaker throttled")
            raise ExternalServiceError("AI service busy, try again shortly") from e
        if code in ("ModelNotReadyException", "ServiceUnavailable"):
            logger.error("SageMaker endpoint not ready: %s", code)
            raise ExternalServiceError("AI service starting up, try again in a minute") from e
        logger.error("SageMaker invoke error [%s]: %s", code, e)
        raise ExternalServiceError("AI service error") from e
    except (BotoCoreError, ReadTimeoutError) as e:
        logger.error("SageMaker connection/timeout: %s", e)
        raise ExternalServiceError("AI service timeout") from e

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


def invoke_mistral(resume_text: str, log_fn=None, progress_fn=None) -> ResumeOutput:
    """Parse resume using per-section chunked processing (N parallel LLM calls).

    log_fn: optional callback log_fn(message, level="info") for live status.
    progress_fn: optional callback progress_fn(chunks_done, chunks_total) for progress.
    """
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
        # Try repairing truncated JSON from the raw cleaned text
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
