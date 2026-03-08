import json
import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError, ReadTimeoutError
from app.config import settings
from app.parser.prompt import build_prompt
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

    # DJL/vLLM returns JSON array; extract generated_text
    try:
        result = json.loads(full_text)
        if isinstance(result, list) and result:
            return result[0].get("generated_text", full_text)
    except json.JSONDecodeError:
        pass
    return full_text


def invoke_mistral(resume_text: str) -> ResumeOutput:
    """Send resume text to Ministral 14B on SageMaker, return parsed ResumeOutput."""
    prompt = build_prompt(resume_text)
    generated_text = invoke_llm(prompt, max_tokens=6000, temperature=0.1)
    return _parse_response(generated_text)


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
        logger.warning("No JSON found in LLM response (%d chars): %.200s...", len(text), text)
        return ResumeOutput()

    json_str = cleaned[start:end]
    try:
        data = json.loads(json_str)
        return ResumeOutput(**data)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed (attempt %d): %s | text: %.200s...", attempt, e, json_str)
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        return ResumeOutput()
    except Exception as e:
        logger.warning("ResumeOutput validation failed (attempt %d): %s", attempt, e)
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        return ResumeOutput()
