"""Resume parsing integration tests.

These tests call the live SageMaker endpoint — they may take 10-30s each.
Run with: pytest tests/test_parse.py -v -s
"""

import pytest


def test_parse_no_file(client):
    """POST /parse without file returns 422."""
    res = client.post("/parse")
    assert res.status_code == 422


def test_parse_invalid_type(client):
    """POST /parse with non-PDF/DOCX returns 400."""
    res = client.post("/parse", files={"file": ("test.txt", b"hello", "text/plain")})
    assert res.status_code == 400


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


def test_parse_s3_missing_key(client):
    """POST /parse-s3 with invalid S3 key returns error."""
    res = client.post("/parse-s3", json={"s3_key": "nonexistent/file.pdf"})
    assert res.status_code in (400, 404, 500)


def test_parse_s3_unsupported_type(client):
    """POST /parse-s3 with unsupported file extension."""
    res = client.post("/parse-s3", json={"s3_key": "resumes/file.jpg"})
    assert res.status_code == 400
