"""A chat turn must survive the model being unavailable.

These cover the Phase 3 promise: when the LLM errors, times out or returns
nothing usable, the candidate still gets an answer built from the job row —
never an exception and never an empty bubble.
"""

import pytest

from app.chat import chatbot
from app.chat.context import clear_cache
from app.exceptions import ExternalServiceError

JOB = {
    "id": "11111111-1111-1111-1111-111111111111",
    "title": "Senior React Developer",
    "description": "Build the web app.",
    "skills": ["React", "TypeScript"],
    "job_type": ["full_time"],
    "work_mode": ["hybrid"],
    "experience_min": 4,
    "experience_max": 8,
    "city": "Bangalore",
    "state": "Karnataka",
    "salary_min": 1800000,
    "salary_max": 3000000,
    "show_salary": True,
    "is_active": True,
    "status": "active",
    "company_name": "Acme Ltd",
}


@pytest.fixture(autouse=True)
def isolated_chat(monkeypatch):
    """Serve a fixed job, keep sessions in memory, and start from a clean cache."""
    clear_cache()
    monkeypatch.setattr(chatbot, "load_job", lambda job_id: dict(JOB))
    monkeypatch.setattr(chatbot, "load_profile", lambda user_id: None)
    monkeypatch.setattr(chatbot, "load_screening", lambda job_id: [])
    monkeypatch.setattr(chatbot, "_get_redis", lambda: None)
    chatbot._sessions.clear()
    yield
    chatbot._sessions.clear()


def fail_llm(*args, **kwargs):
    raise ExternalServiceError("AI service timeout")


def test_llm_outage_still_answers_from_the_job_row(monkeypatch):
    monkeypatch.setattr(chatbot, "invoke_chat", fail_llm)

    result = chatbot.chat(JOB["id"], "what is the salary?", "s1")

    assert result["degraded"] is True
    assert "18 LPA" in result["response"]
    assert result["messages"]


def test_llm_outage_never_leaks_the_error_to_the_candidate(monkeypatch):
    monkeypatch.setattr(chatbot, "invoke_chat", fail_llm)

    response = chatbot.chat(JOB["id"], "what skills do i need?", "s2")["response"]

    for leak in ("timeout", "503", "Traceback", "AI service"):
        assert leak.lower() not in response.lower()


def test_empty_model_output_falls_back_rather_than_sending_a_blank_bubble(monkeypatch):
    monkeypatch.setattr(chatbot, "invoke_chat", lambda *a, **k: "   ")

    result = chatbot.chat(JOB["id"], "where is this based?", "s3")

    assert result["degraded"] is True
    assert "Bangalore" in result["response"]


def test_suggestions_survive_an_outage(monkeypatch):
    monkeypatch.setattr(chatbot, "invoke_chat", fail_llm)

    assert chatbot.chat(JOB["id"], "tell me about the role", "s4")["suggestions"]


def test_greeting_never_reaches_the_model(monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("small talk must not call the LLM")

    monkeypatch.setattr(chatbot, "invoke_chat", explode)

    result = chatbot.chat(JOB["id"], "hi", "s5")

    assert result["degraded"] is False
    assert "Senior React Developer" in result["response"]


def test_missing_job_is_reported_without_calling_the_model(monkeypatch):
    monkeypatch.setattr(chatbot, "load_job", lambda job_id: None)
    monkeypatch.setattr(chatbot, "invoke_chat", fail_llm)

    result = chatbot.chat("22222222-2222-2222-2222-222222222222", "hello?", "s6")

    assert "couldn't find" in result["response"]
    assert result["suggestions"] == []


def test_history_records_the_degraded_answer(monkeypatch):
    monkeypatch.setattr(chatbot, "invoke_chat", fail_llm)

    chatbot.chat(JOB["id"], "what is the salary?", "s7")
    history = chatbot._get_history("s7")

    assert [turn["role"] for turn in history] == ["user", "assistant"]
    assert "18 LPA" in history[1]["content"]


def test_a_good_answer_is_not_marked_degraded(monkeypatch):
    monkeypatch.setattr(
        chatbot, "invoke_chat", lambda *a, **k: "The salary is 18 to 30 LPA for this role."
    )

    result = chatbot.chat(JOB["id"], "what is the salary?", "s8")

    assert result["degraded"] is False
    assert result["response"].startswith("The salary is 18")


def test_history_is_replayed_as_roles_not_a_transcript(monkeypatch):
    captured = {}

    def capture(messages, **kwargs):
        captured["messages"] = messages
        return "Sure, it is hybrid."

    monkeypatch.setattr(chatbot, "invoke_chat", capture)

    chatbot.chat(JOB["id"], "what is the salary?", "s9")
    chatbot.chat(JOB["id"], "and the work mode?", "s9")

    roles = [m["role"] for m in captured["messages"]]
    assert roles[0] == "system"
    assert roles[1:] == ["user", "assistant", "user"]
    assert "Candidate:" not in captured["messages"][0]["content"]
