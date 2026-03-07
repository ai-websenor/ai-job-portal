"""Recommendation engine integration tests.

Tests against live DB + SageMaker. Run with: pytest tests/test_recommend.py -v -s
Requires seed data (run scripts/seed_test_data.py first).
"""

import uuid
import pytest


def test_recommend_missing_input(client):
    """POST /recommend without user_id or skills returns 400."""
    res = client.post("/recommend", json={})
    assert res.status_code == 400


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
    # Should be sorted by score descending
    scores = [r["score"] for r in recs]
    assert scores == sorted(scores, reverse=True)
    # Each rec should have required fields
    for rec in recs:
        assert "job_id" in rec
        assert "score" in rec
        assert 0 <= rec["score"] <= 100
        assert "title" in rec
        assert "reason" in rec


@pytest.mark.slow
def test_recommend_by_skills(client):
    """POST /recommend with manual skills input (integration)."""
    res = client.post("/recommend", json={
        "skills": ["Python", "React", "JavaScript"],
        "experience_years": 3,
        "location": "Mumbai",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0


@pytest.mark.slow
def test_recommend_by_skills_niche(client):
    """POST /recommend with niche skills — may get fewer matches."""
    res = client.post("/recommend", json={
        "skills": ["COBOL", "Fortran"],
        "experience_years": 20,
    })
    assert res.status_code == 200
    # Might return 0 or low-score matches — that's expected
    data = res.json()
    assert isinstance(data["recommendations"], list)
