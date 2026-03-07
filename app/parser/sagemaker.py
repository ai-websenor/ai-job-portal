import json
import boto3
from app.config import settings
from app.parser.prompt import build_prompt
from app.models.resume import ResumeOutput


def get_sagemaker_client():
    session = boto3.Session(profile_name=settings.aws_profile, region_name=settings.aws_region)
    return session.client("sagemaker-runtime")


def invoke_mistral(resume_text: str) -> ResumeOutput:
    """Send resume text to Mistral 7B on SageMaker, return parsed ResumeOutput."""
    client = get_sagemaker_client()
    prompt = build_prompt(resume_text)

    payload = {
        "inputs": f"<s>[INST] {prompt} [/INST]",
        "parameters": {
            "max_new_tokens": 4096,
            "temperature": 0.1,
            "do_sample": False,
            "return_full_text": False,
        },
    }

    response = client.invoke_endpoint(
        EndpointName=settings.sagemaker_endpoint_name,
        ContentType="application/json",
        Body=json.dumps(payload),
    )

    result = json.loads(response["Body"].read().decode("utf-8"))
    generated_text = result[0]["generated_text"]

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
