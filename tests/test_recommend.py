"""Recommendation engine integration tests.

Tests against live DB + configured LLM. Run with: pytest tests/test_recommend.py -v -s
Requires seed data (run scripts/seed_test_data.py first).
"""

import uuid
import pytest


# ── Negative Tests ─────────────────────────────


def test_recommend_missing_user_id(client):
    """POST /recommend without user_id returns 422 (required field)."""
    res = client.post("/recommend", json={})
    assert res.status_code == 422


def test_recommend_invalid_user_id_format(client):
    """POST /recommend with non-UUID user_id returns 422."""
    res = client.post("/recommend", json={"user_id": "not-a-uuid"})
    assert res.status_code == 422


def test_recommend_negative_experience(client):
    """POST /recommend with negative experience_years returns 422."""
    res = client.post("/recommend", json={
        "user_id": str(uuid.uuid4()),
        "experience_years": -5,
    })
    assert res.status_code == 422


def test_recommend_experience_too_high(client):
    """POST /recommend with experience > 60 returns 422."""
    res = client.post("/recommend", json={
        "user_id": str(uuid.uuid4()),
        "experience_years": 65,
    })
    assert res.status_code == 422


def test_recommend_too_many_skills(client):
    """POST /recommend with > 50 skills returns 422."""
    res = client.post("/recommend", json={
        "user_id": str(uuid.uuid4()),
        "skills": [f"skill-{i}" for i in range(60)],
    })
    assert res.status_code == 422


def test_recommend_skill_too_long(client):
    """POST /recommend with skill > 100 chars returns 422."""
    res = client.post("/recommend", json={
        "user_id": str(uuid.uuid4()),
        "skills": ["x" * 101],
    })
    assert res.status_code == 422


def test_recommend_location_too_long(client):
    """POST /recommend with location > 200 chars returns 422."""
    res = client.post("/recommend", json={
        "user_id": str(uuid.uuid4()),
        "location": "x" * 201,
    })
    assert res.status_code == 422


# ── Positive Tests ─────────────────────────────


def test_recommend_invalid_user(client):
    """POST /recommend with non-existent user returns empty list."""
    res = client.post("/recommend", json={"user_id": str(uuid.uuid4())})
    assert res.status_code == 200
    data = res.json()
    assert data["recommendations"] == []
    assert data["count"] == 0


@pytest.mark.slow
def test_recommend_by_user_id(client, user_id):
    """POST /recommend with seeded user — should get ranked job matches (integration)."""
    res = client.post("/recommend", json={"user_id": user_id})
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    recs = data["recommendations"]
    scores = [r["score"] for r in recs]
    assert scores == sorted(scores, reverse=True)
    for rec in recs:
        assert "job_id" in rec
        assert "score" in rec
        assert 0 <= rec["score"] <= 100
        assert "title" in rec
        assert "reason" in rec


@pytest.mark.slow
def test_recommend_by_skills(client, user_id):
    """POST /recommend with user_id + skills filter (integration)."""
    res = client.post("/recommend", json={
        "user_id": user_id,
        "skills": ["Python", "React", "JavaScript"],
        "experience_years": 3,
        "location": "Mumbai",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0


@pytest.mark.slow
def test_recommend_by_skills_niche(client, user_id):
    """POST /recommend with niche skills — may get fewer matches."""
    res = client.post("/recommend", json={
        "user_id": user_id,
        "skills": ["COBOL", "Fortran"],
        "experience_years": 20,
    })
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["recommendations"], list)
