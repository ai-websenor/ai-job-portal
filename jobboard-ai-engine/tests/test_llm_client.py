import json

import httpx
import pytest

from app.exceptions import ExternalServiceError
from app.parser import llm


@pytest.fixture(autouse=True)
def reset_llm_client():
    old_client = llm._client
    llm._client = None
    yield
    if llm._client:
        llm._client.close()
    llm._client = old_client


def _mock_client(handler):
    llm._client = httpx.Client(
        base_url="http://model.local/v1",
        transport=httpx.MockTransport(handler),
    )


def test_invoke_llm_calls_openai_compatible_chat_completion():
    def handler(request):
        body = json.loads(request.content)
        assert request.method == "POST"
        assert request.url.path == "/v1/chat/completions"
        assert body["messages"][0]["content"] == "parse resume"
        assert body["max_tokens"] == 128
        return httpx.Response(200, json={"choices": [{"message": {"content": "parsed"}}]})

    _mock_client(handler)

    assert llm.invoke_llm("parse resume", max_tokens=128, temperature=0.1) == "parsed"


def test_invoke_llm_timeout_maps_to_external_service_error():
    def handler(request):
        raise httpx.ReadTimeout("slow model", request=request)

    _mock_client(handler)

    with pytest.raises(ExternalServiceError, match="AI service timeout"):
        llm.invoke_llm("parse resume")


def test_invoke_llm_retries_retryable_model_status(monkeypatch):
    calls = 0

    def handler(request):
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(503, json={"error": "warming"})
        return httpx.Response(200, json={"choices": [{"message": {"content": "ready"}}]})

    monkeypatch.setattr(llm.time, "sleep", lambda _: None)
    monkeypatch.setattr(llm.random, "uniform", lambda *_: 0)
    _mock_client(handler)

    assert llm.invoke_llm("parse resume") == "ready"
    assert calls == 2


def test_invoke_llm_empty_response_is_error():
    def handler(request):
        return httpx.Response(200, json={"choices": [{"message": {"content": ""}}]})

    _mock_client(handler)

    with pytest.raises(ExternalServiceError, match="AI service returned empty response"):
        llm.invoke_llm("parse resume")
