"""Resume parsing integration tests.

These tests call the live SageMaker endpoint — they may take 30-90s each.
Run with: pytest tests/test_parse.py -v -s
"""

import pytest


# ── /parse Negative Tests ──────────────────────


def test_parse_no_file(client):
    """POST /parse without file returns 422."""
    res = client.post("/parse")
    assert res.status_code == 422


def test_parse_invalid_type(client):
    """POST /parse with non-PDF/DOCX returns 400."""
    res = client.post("/parse", files={"file": ("test.txt", b"hello", "text/plain")})
    assert res.status_code == 400


def test_parse_empty_pdf(client):
    """POST /parse with 0-byte PDF returns 422."""
    res = client.post("/parse", files={"file": ("empty.pdf", b"", "application/pdf")})
    assert res.status_code == 422


def test_parse_corrupt_pdf(client):
    """POST /parse with random bytes as PDF returns 422."""
    res = client.post("/parse", files={"file": ("bad.pdf", b"not-a-pdf-content-at-all", "application/pdf")})
    assert res.status_code == 422


def test_parse_oversized_file(client):
    """POST /parse with >10MB file returns 400."""
    big_content = b"%PDF-1.4 " + (b"x" * (11 * 1024 * 1024))
    res = client.post("/parse", files={"file": ("huge.pdf", big_content, "application/pdf")})
    assert res.status_code == 400


# ── /parse-s3 Negative Tests ──────────────────


def test_parse_s3_empty_key(client):
    """POST /parse-s3 with empty s3_key returns 422."""
    res = client.post("/parse-s3", json={"s3_key": ""})
    assert res.status_code == 422


def test_parse_s3_path_traversal(client):
    """POST /parse-s3 with path traversal in s3_key returns 422."""
    res = client.post("/parse-s3", json={"s3_key": "../../etc/passwd.pdf"})
    assert res.status_code == 422


def test_parse_s3_invalid_user_id(client):
    """POST /parse-s3 with non-UUID user_id returns 422."""
    res = client.post("/parse-s3", json={
        "s3_key": "resumes/test.pdf",
        "user_id": "bad-uuid",
    })
    assert res.status_code == 422


def test_parse_s3_invalid_resume_id(client):
    """POST /parse-s3 with non-UUID resume_id returns 422."""
    res = client.post("/parse-s3", json={
        "s3_key": "resumes/test.pdf",
        "resume_id": "bad-uuid",
    })
    assert res.status_code == 422


def test_parse_s3_unsupported_type(client):
    """POST /parse-s3 with unsupported file extension."""
    res = client.post("/parse-s3", json={"s3_key": "resumes/file.jpg"})
    assert res.status_code == 400


def test_parse_s3_missing_key(client):
    """POST /parse-s3 with non-existent S3 key returns 404 or 503."""
    res = client.post("/parse-s3", json={"s3_key": "nonexistent/file.pdf"})
    assert res.status_code in (404, 503)


# ── /parse Positive Tests ─────────────────────


@pytest.mark.skipif(
    not pytest.importorskip("boto3", reason="boto3 not available"),
    reason="Needs AWS credentials"
)
def test_parse_pdf(client, sample_pdf_path):
    """POST /parse with PDF resume (integration, needs SageMaker)."""
    if not sample_pdf_path:
        pytest.skip("No sample PDF in tests/fixtures/")
    with open(sample_pdf_path, "rb") as f:
        res = client.post("/parse", files={"file": ("resume.pdf", f, "application/pdf")})
    assert res.status_code == 200
    data = res.json()
    assert "personal" in data
    assert "experience" in data
    assert "skills" in data
    assert "s3_uploaded" in data


@pytest.mark.skipif(
    not pytest.importorskip("boto3", reason="boto3 not available"),
    reason="Needs AWS credentials"
)
def test_parse_docx(client, sample_docx_path):
    """POST /parse with DOCX resume (integration, needs SageMaker)."""
    if not sample_docx_path:
        pytest.skip("No sample DOCX in tests/fixtures/")
    with open(sample_docx_path, "rb") as f:
        res = client.post("/parse", files={
            "file": ("resume.docx", f,
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        })
    assert res.status_code == 200
    data = res.json()
    assert "personal" in data
    assert "s3_uploaded" in data
