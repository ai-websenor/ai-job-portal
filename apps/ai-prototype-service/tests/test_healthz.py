"""Behavior tests for /healthz."""

from fastapi.testclient import TestClient

from app.main import app


def test_healthz_returns_ok_when_app_is_ready():
    # Mirror the post-startup state. TestClient's `with` block triggers
    # lifespan, which sets app.state.ready = True.
    with TestClient(app) as client:
        resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_healthz_returns_503_when_app_not_ready():
    # Simulate the ALB-during-cold-start case: a request that hits the app
    # before lifespan has marked it ready.
    app.state.ready = False
    client = TestClient(app)  # bare client, no `with` → lifespan not run
    resp = client.get("/healthz")
    assert resp.status_code == 503
    assert resp.json() == {"status": "starting"}
