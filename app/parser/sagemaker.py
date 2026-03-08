import json
import boto3
from botocore.config import Config
from app.config import settings
from app.parser.prompt import build_prompt
from app.models.resume import ResumeOutput


def get_sagemaker_client():
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_profile:
        kwargs["profile_name"] = settings.aws_profile
    session = boto3.Session(**kwargs)
    return session.client("sagemaker-runtime", config=Config(read_timeout=300))


def invoke_llm(prompt: str, max_tokens: int = 4096, temperature: float = 0.1) -> str:
    """Generic LLM invoke — sends prompt to Ministral 14B via streaming, returns raw text."""
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

    response = client.invoke_endpoint_with_response_stream(
        EndpointName=settings.sagemaker_endpoint_name,
        ContentType="application/json",
        Body=json.dumps(payload),
    )

    # Collect streamed chunks
    full_text = ""
    for event in response["Body"]:
        chunk = event.get("PayloadPart", {}).get("Bytes", b"")
        if chunk:
            full_text += chunk.decode("utf-8")

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
    """Parse LLM JSON response into ResumeOutput. Retries on malformed JSON."""
    # Strip markdown code fences if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Find JSON object boundaries
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start == -1 or end == 0:
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        return ResumeOutput()

    json_str = cleaned[start:end]
    try:
        data = json.loads(json_str)
        return ResumeOutput(**data)
    except (json.JSONDecodeError, Exception):
        if attempt < 2:
            return _parse_response(text, attempt + 1)
        return ResumeOutput()
