"""Chatbot integration tests.

Tests against live DB + configured LLM. Run with: pytest tests/test_chat.py -v -s
Requires seed data (run scripts/seed_test_data.py first).
"""

import uuid
import pytest

from tests.conftest import requires_db


# ── Negative Tests ─────────────────────────────


def test_chat_missing_fields(client):
    """POST /chat without required fields returns 422."""
    res = client.post("/chat", json={})
    assert res.status_code == 422


def test_chat_invalid_job_id_format(client):
    """POST /chat with non-UUID job_id returns 422."""
    res = client.post("/chat", json={
        "job_id": "not-a-uuid",
        "message": "Tell me about this job",
        "session_id": "test-session",
    })
    assert res.status_code == 422


def test_chat_empty_message(client):
    """POST /chat with empty message returns 422."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "",
        "session_id": "test-session",
    })
    assert res.status_code == 422


def test_chat_whitespace_message(client):
    """POST /chat with whitespace-only message returns 422."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "   ",
        "session_id": "test-session",
    })
    assert res.status_code == 422


def test_chat_message_too_long(client):
    """POST /chat with message > 2000 chars returns 422."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "x" * 2001,
        "session_id": "test-session",
    })
    assert res.status_code == 422


def test_chat_session_id_too_long(client):
    """POST /chat with session_id > 128 chars returns 422."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "Hello",
        "session_id": "x" * 129,
    })
    assert res.status_code == 422


def test_chat_invalid_user_id_format(client):
    """POST /chat with non-UUID user_id returns 422."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "Hello",
        "session_id": "test-session",
        "user_id": "not-a-uuid",
    })
    assert res.status_code == 422


@requires_db
def test_chat_without_user_id(client):
    """POST /chat without user_id still works (backward compatible)."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "Tell me about this job",
        "session_id": "test-no-user",
    })
    assert res.status_code == 200


# ── Positive Tests ─────────────────────────────


@requires_db
def test_chat_invalid_job(client):
    """POST /chat with non-existent job returns fallback message."""
    res = client.post("/chat", json={
        "job_id": str(uuid.uuid4()),
        "message": "Tell me about this job",
        "session_id": "test-invalid-job",
    })
    assert res.status_code == 200
    data = res.json()
    assert "couldn't find" in data["response"].lower() or "sorry" in data["response"].lower()


@requires_db
@pytest.mark.slow
def test_chat_single_turn(client, job_id):
    """POST /chat with valid job — single question (integration, needs live LLM)."""
    res = client.post("/chat", json={
        "job_id": job_id,
        "message": "What skills are required for this position?",
        "session_id": f"test-single-{uuid.uuid4().hex[:8]}",
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["response"]) > 10
    assert data["session_id"].startswith("test-single-")


@requires_db
@pytest.mark.slow
def test_chat_multi_turn(client, job_id):
    """POST /chat multi-turn — second message references first (integration)."""
    session = f"test-multi-{uuid.uuid4().hex[:8]}"

    # Turn 1
    res1 = client.post("/chat", json={
        "job_id": job_id,
        "message": "What is the salary range?",
        "session_id": session,
    })
    assert res1.status_code == 200

    # Turn 2 — references context from turn 1
    res2 = client.post("/chat", json={
        "job_id": job_id,
        "message": "Is that per year or per month?",
        "session_id": session,
    })
    assert res2.status_code == 200
    assert len(res2.json()["response"]) > 5
