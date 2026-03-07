"""Shared test fixtures for AI Engine integration tests."""

import os
import pytest
from fastapi.testclient import TestClient

# Ensure env loaded before app import
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:xZsb3c91pZrJLmg@ai-job-portal-dev.czemc0204jzt.ap-south-1.rds.amazonaws.com:5432/ai_job_portal_dev?sslmode=require")

from app.main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


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
