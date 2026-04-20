"""Tests for the page-as-chunk raw parse pipeline.

Covers:
- PDF extraction yields per-page list + ligature unwrap
- merge_page_results dedup / first-non-empty / cross-page experience merge
- process_raw with a mocked invoke_llm (no endpoint calls)
- Empty-page skip path
- Parse-mode dispatcher and PDF-only enforcement

Live-endpoint test (RUN_LIVE_LLM=1) parses the 3 failing PDFs in docs/ and
asserts we recover fields the legacy chunked path was dropping.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest

from app.config import settings
from app.extractors.pdf import _unwrap_ligatures, extract_pages_from_pdf
from app.models.resume import (
    EducationalDetail,
    ExperienceDetail,
    LanguageDetail,
    PersonalDetails,
    ProjectDetail,
    ResumeOutput,
    SkillDetail,
)
from app.parser.chunked_processor import (
    _dedup_experiences_merging,
    _dedup_projects,
    _dedup_skills,
    _merge_personal,
    merge_page_results,
    process_raw,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"

FAILING_PDFS = [
    DOCS_DIR / "Dvg.pdf",
    DOCS_DIR / "Latest.pdf",
    DOCS_DIR / "VishwanathHiremath_Front (1).pdf",
]


# ─────────────────────────────────────────────
# PDF extractor: pages list + ligature unwrap
# ─────────────────────────────────────────────


def test_unwrap_ligatures_replaces_pdf_typography():
    raw = "opƟmizing ƫime with ﬁnal ﬀice"
    out = _unwrap_ligatures(raw)
    assert "Ɵ" not in out
    assert "ﬁ" not in out
    assert "optimizing" in out
    assert "ttiime" in out  # ƫ→tti, "ƫime" → "ttiime"
    assert "final" in out


@pytest.mark.parametrize("pdf_path", FAILING_PDFS, ids=lambda p: p.name)
def test_extract_pages_from_pdf_returns_per_page_text(pdf_path):
    assert pdf_path.exists(), f"fixture missing: {pdf_path}"
    pages, count = extract_pages_from_pdf(pdf_path.read_bytes())
    assert count >= 1
    assert len(pages) == count
    # No unconverted ligatures survive
    joined = "\n".join(pages)
    assert "Ɵ" not in joined
    assert "ﬁ" not in joined


# ─────────────────────────────────────────────
# merge_page_results — field-level dedup rules
# ─────────────────────────────────────────────


def test_merge_personal_first_non_empty_wins():
    acc = PersonalDetails(firstName="Vishwanath")
    new = PersonalDetails(firstName="OVERRIDE", lastName="Hiremath", phone="+9178...")
    merged = _merge_personal(acc, new)
    assert merged.firstName == "Vishwanath"  # first non-empty wins
    assert merged.lastName == "Hiremath"     # acc was empty → new wins
    assert merged.phone == "+9178..."


def test_dedup_skills_prefers_higher_proficiency():
    skills = [
        SkillDetail(skillName="React", proficiencyLevel="intermediate"),
        SkillDetail(skillName="react", proficiencyLevel="expert"),
        SkillDetail(skillName="Python", proficiencyLevel="beginner"),
    ]
    out = _dedup_skills(skills)
    names = {s.skillName.lower(): s.proficiencyLevel for s in out}
    assert names["react"] == "expert"
    assert names["python"] == "beginner"
    assert len(out) == 2


def test_dedup_experiences_merges_split_across_pages():
    # Page 2 has the header row for a job, page 3 continues its bullets.
    a = ExperienceDetail(
        title="Front-End Developer",
        designation="Front-End Developer",
        companyName="Bhavitha Tech",
        startDate="2024-05-01",
        description="",
    )
    b = ExperienceDetail(
        title="Front-End Developer",
        designation="Front-End Developer",
        companyName="Bhavitha Tech",
        startDate="2024-05-01",
        description="Leading React apps; Integrated GraphQL APIs",
    )
    merged = _dedup_experiences_merging([a, b])
    assert len(merged) == 1
    assert "Leading React apps" in merged[0].description
    assert "Integrated GraphQL" in merged[0].description


def test_dedup_projects_merges_descriptions_by_name():
    p1 = ProjectDetail(name="HRMS2", description="Government platform", technologies="React")
    p2 = ProjectDetail(name="hrms2", description="Karnataka HR system", technologies="Redux")
    p3 = ProjectDetail(name="AssetWRK", description="Asset tracker", technologies="React, SQL")
    out = _dedup_projects([p1, p2, p3])
    names = [p.name for p in out]
    assert len(out) == 2
    hrms = next(p for p in out if p.name.lower() == "hrms2")
    assert "Government platform" in hrms.description
    assert "Karnataka HR system" in hrms.description


def test_merge_page_results_empty_pages_yield_empty_output():
    out = merge_page_results([None, {}, None])
    assert isinstance(out, ResumeOutput)
    assert out.personalDetails.firstName == ""
    assert out.experienceDetails == []


def test_merge_page_results_full_flow():
    page1 = {
        "personalDetails": {
            "firstName": "Vishwanath", "lastName": "Hiremath",
            "phone": "+91 78925 31509", "linkedin": "linkedin.com/in/vish",
            "headline": "React JS Developer", "professionalSummary": "Front-End Developer...",
            "country": "", "state": "Karnataka", "city": "Bangalore",
            "github": "", "website": "", "gender": "",
        },
        "skills": [
            {"skillName": "JavaScript", "proficiencyLevel": "advanced", "yearsOfExperience": None},
            {"skillName": "React.js", "proficiencyLevel": "expert", "yearsOfExperience": None},
        ],
        "experienceDetails": [],
        "educationalDetails": [],
        "projects": [],
        "certifications": [],
        "languages": [],
    }
    page2 = {
        "personalDetails": {k: "" for k in page1["personalDetails"]},
        "skills": [
            {"skillName": "TypeScript", "proficiencyLevel": "intermediate", "yearsOfExperience": None},
            # duplicate, lower proficiency — should lose to page 1's "expert"
            {"skillName": "react.js", "proficiencyLevel": "beginner", "yearsOfExperience": None},
        ],
        "experienceDetails": [
            {
                "title": "Front-End Developer", "designation": "Front-End Developer",
                "companyName": "Bhavitha Tech", "employmentType": "full_time",
                "location": "Bangalore", "startDate": "2024-05-01", "endDate": None,
                "isCurrent": True, "description": "Enterprise Architecture; API Optimization",
                "achievements": "", "skillsUsed": "React, TypeScript",
            },
        ],
        "educationalDetails": [],
        "projects": [{"name": "HRMS2", "description": "Gov HR", "technologies": "React", "url": ""}],
        "certifications": [],
        "languages": [],
    }
    out = merge_page_results([page1, page2])
    assert out.personalDetails.firstName == "Vishwanath"
    # LinkedIn URL gets https:// prefix via _coerce_flat_fields
    assert out.personalDetails.linkedin.startswith("https://")
    # react.js dedup: page 1's "expert" beats page 2's "beginner"
    react = next(s for s in out.skills if s.skillName.lower() == "react.js")
    assert react.proficiencyLevel == "expert"
    # TypeScript added from page 2
    assert any(s.skillName == "TypeScript" for s in out.skills)
    assert len(out.experienceDetails) == 1
    assert out.experienceDetails[0].companyName == "Bhavitha Tech"
    assert len(out.projects) == 1


# ─────────────────────────────────────────────
# process_raw with mocked LLM
# ─────────────────────────────────────────────


class _FakeInvoke:
    """Callable replacing sagemaker.invoke_llm — returns canned JSON per call."""
    def __init__(self, responses: list[str]):
        self.responses = list(responses)
        self.calls = 0

    def __call__(self, prompt, max_tokens, temperature):
        assert self.responses, "FakeInvoke out of responses"
        self.calls += 1
        return self.responses.pop(0)


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def test_process_raw_chunks_and_fires_one_call_per_chunk():
    # Two big paragraphs, each will become its own chunk at 1500-char cap.
    big_para_1 = "VISHWANATH HIREMATH — React JS Developer. " + ("Profile summary text. " * 60)
    big_para_2 = "PROFESSIONAL EXPERIENCE. Bhavitha Tech Solutions May 2024 - Present. " + ("Led React development. " * 60)
    pages = [big_para_1, "   ", big_para_2]  # whitespace-only page is dropped when joined

    responses = [
        json.dumps({"personalDetails": {"firstName": "Vishwanath", "lastName": "Hiremath"}}),  # partial JSON OK
        json.dumps({
            "experienceDetails": [
                {
                    "title": "Front-End Developer", "designation": "Front-End Developer",
                    "companyName": "Bhavitha Tech", "employmentType": "full_time",
                    "location": "Bangalore", "startDate": "2024-05-01", "endDate": None,
                    "isCurrent": True,
                    "description": "Enterprise Architecture; API Optimization",
                    "achievements": "", "skillsUsed": "",
                },
            ],
        }),
    ]
    fake = _FakeInvoke(responses)

    with patch("app.parser.chunked_processor.invoke_llm", side_effect=fake):
        out = _run(process_raw(pages))

    assert fake.calls == 2  # one call per chunk, whitespace-only page dropped
    assert out.personalDetails.firstName == "Vishwanath"
    assert len(out.experienceDetails) == 1
    assert out.experienceDetails[0].companyName == "Bhavitha Tech"


def test_process_raw_all_empty_pages_yields_empty_output():
    fake = _FakeInvoke([])
    with patch("app.parser.chunked_processor.invoke_llm", side_effect=fake):
        out = _run(process_raw(["   ", "\n\n\n", ""]))
    assert fake.calls == 0
    assert out.personalDetails.firstName == ""


def test_chunk_text_for_raw_respects_cap_and_boundaries():
    from app.parser.chunked_processor import chunk_text_for_raw

    text = "Paragraph A\nline 1\nline 2\n\n" + ("Paragraph B sentence. " * 50) + "\n\nParagraph C"
    chunks = chunk_text_for_raw(text, 500)
    assert chunks, "should produce at least one chunk"
    for c in chunks:
        assert len(c) <= 500, f"chunk exceeded cap: {len(c)} chars"
    joined = "\n\n".join(chunks)
    # Content preserved (order + no dropped paragraphs)
    assert "Paragraph A" in joined
    assert "Paragraph C" in joined


def test_process_raw_tolerates_one_page_failing():
    pages = [
        "page 1 with real content " + "x" * 100,
        "page 2 with real content " + "y" * 100,
    ]
    # Page 1 returns garbage → parsed as None. Page 2 returns valid JSON.
    responses = [
        "not json at all 😬",
        json.dumps({
            "personalDetails": {"firstName": "Vish"},
            "skills": [{"skillName": "React", "proficiencyLevel": "expert", "yearsOfExperience": None}],
            "experienceDetails": [], "educationalDetails": [],
            "projects": [], "certifications": [], "languages": [],
        }),
    ]
    fake = _FakeInvoke(responses)
    with patch("app.parser.chunked_processor.invoke_llm", side_effect=fake):
        out = _run(process_raw(pages))
    assert out.personalDetails.firstName == "Vish"
    assert any(s.skillName == "React" for s in out.skills)


# ─────────────────────────────────────────────
# Config + dispatcher
# ─────────────────────────────────────────────


def test_parse_mode_default_is_whole():
    assert settings.parse_mode == "whole"


def test_process_whole_single_call_happy_path():
    from app.parser.chunked_processor import process_whole

    stub = json.dumps({
        "personalDetails": {"firstName": "Ava", "headline": "Full-Stack Engineer"},
        "skills": [{"skillName": "Python", "proficiencyLevel": "Expert"}],
        "experienceDetails": [{
            "title": "Senior Engineer", "companyName": "Acme", "startDate": "2022-01-01",
        }],
    })

    with patch("app.parser.chunked_processor.invoke_llm", return_value=stub):
        output = asyncio.run(process_whole("Ava  ·  Full-Stack Engineer  ·  Acme 2022-01"))

    assert output.personalDetails.firstName == "Ava"
    assert any(s.skillName == "Python" for s in output.skills)
    assert any(e.companyName == "Acme" for e in output.experienceDetails)


def test_process_whole_raises_on_unparseable_output():
    from app.parser.chunked_processor import process_whole, WholeParseFailed

    with patch("app.parser.chunked_processor.invoke_llm", return_value="not json at all"):
        with pytest.raises(WholeParseFailed):
            asyncio.run(process_whole("some resume text"))


def test_api_rejects_non_pdf(client=None):
    # FastAPI TestClient from conftest
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    res = c.post("/parse", files={"file": ("test.docx", b"PK", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert res.status_code == 400
    assert "Only PDF" in res.json()["detail"]


# ─────────────────────────────────────────────
# Live endpoint smoke — opt-in via RUN_LIVE_LLM=1
# ─────────────────────────────────────────────


@pytest.mark.skipif(os.getenv("RUN_LIVE_LLM") != "1", reason="set RUN_LIVE_LLM=1 to hit SageMaker")
@pytest.mark.parametrize("pdf_path", FAILING_PDFS, ids=lambda p: p.name)
def test_live_raw_extraction_recovers_fields(pdf_path):
    from app.parser.sagemaker import invoke_mistral_raw

    pages, _ = extract_pages_from_pdf(pdf_path.read_bytes())

    logs: list[str] = []
    def log_fn(msg, level="info"):
        logs.append(f"[{level}] {msg}")

    out = invoke_mistral_raw(pages, log_fn=log_fn)

    # Client's line-by-line bar: these 3 PDFs were losing skills/experience before.
    assert out.personalDetails.firstName.upper() == "VISHWANATH", \
        f"name missing. logs:\n{chr(10).join(logs[-40:])}"
    assert len(out.experienceDetails) >= 2, f"expected ≥2 experience entries, got {len(out.experienceDetails)}"
    assert len(out.projects) >= 5, f"expected ≥5 projects, got {len(out.projects)}"
    assert len(out.skills) >= 8, f"expected ≥8 skills, got {len(out.skills)}"
    assert len(out.educationalDetails) >= 1, "EDUCATION row missing"
