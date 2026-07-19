"""Shared test fixtures for AI Engine integration tests."""

import os
import pytest
from fastapi.testclient import TestClient

# Ensure env loaded before app import
# Load .env file for DATABASE_URL and other settings
from dotenv import load_dotenv
load_dotenv()

from app.main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


_db_status: bool | None = None


def db_available() -> bool:
    """True when the configured Postgres is reachable. Cached for the session
    so DB-dependent integration tests skip cleanly (instead of failing 503)
    on machines without a local database."""
    global _db_status
    if _db_status is None:
        try:
            import psycopg2
            conn = psycopg2.connect(os.environ.get("DATABASE_URL", ""), connect_timeout=2)
            conn.close()
            _db_status = True
        except Exception:
            _db_status = False
    return _db_status


requires_db = pytest.mark.skipif(
    not db_available(), reason="database not reachable (integration test)"
)


# Seeded test data IDs
SEED_JOB_IDS = [f"b0000000-0000-0000-0000-0000000000{i:02d}" for i in range(1, 11)]
SEED_USER_IDS = [f"d0000000-0000-0000-0000-00000000000{i}" for i in range(1, 6)]


@pytest.fixture
def job_id():
    """First seeded job: Senior Full Stack Developer at TechVista."""
    return SEED_JOB_IDS[0]


@pytest.fixture
def user_id():
    """First seeded user: Arjun Sharma, 8yr Full Stack."""
    return SEED_USER_IDS[0]


@pytest.fixture
def sample_pdf_path():
    """Path to a sample PDF resume for testing (if available)."""
    path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_resume.pdf")
    if os.path.exists(path):
        return path
    return None


@pytest.fixture
def sample_docx_path():
    """Path to a sample DOCX resume for testing (if available)."""
    path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_resume.docx")
    if os.path.exists(path):
        return path
    return None
