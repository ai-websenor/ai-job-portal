"""Regression tests for deterministic resume-output validation."""

import json
import re
from pathlib import Path

from app.config import Settings
from app.models.resume import PersonalDetails, ProjectDetail, ResumeOutput
from app.parser.chunked_processor import apply_deterministic_overrides
from app.parser.grounding import apply_grounding


REPO_ROOT = Path(__file__).resolve().parent.parent


def test_default_model_matches_vllm_deployment():
    script = (REPO_ROOT / "infra" / "qwen-ec2-user-data.sh").read_text()
    deployed = re.search(r"--model\s+(\S+)", script)
    template = (REPO_ROOT / ".env.template").read_text()
    template_model = re.search(r"^LLM_MODEL=(\S+)$", template, re.MULTILINE)

    assert deployed
    assert template_model

    configured_models = {
        Settings.model_fields["llm_model"].default,
        deployed.group(1),
        template_model.group(1),
    }
    for task_file in (
        "task-definition.json",
        "task-definition-staging.json",
    ):
        task = json.loads((REPO_ROOT / "infra" / task_file).read_text())
        environment = task["containerDefinitions"][0]["environment"]
        configured_models.add(
            next(item["value"] for item in environment if item["name"] == "LLM_MODEL")
        )

    assert configured_models == {"Qwen/Qwen2.5-3B-Instruct"}


def test_present_enddate_becomes_null_and_current():
    from app.models.resume import ExperienceDetail
    output = ResumeOutput(
        experienceDetails=[ExperienceDetail(title="Dev", companyName="X",
                                            startDate="2025-02-01", endDate="Present")]
    )
    result = apply_deterministic_overrides(output, "")
    exp = result.experienceDetails[0]
    assert exp.endDate is None
    assert exp.isCurrent is True


def test_empty_project_header_dropped():
    output = ResumeOutput(projects=[ProjectDetail(name="Personal Projects")])
    result = apply_deterministic_overrides(output, "")
    assert result.projects == []


def test_project_with_content_kept():
    output = ResumeOutput(projects=[ProjectDetail(name="HRMS", description="HR system")])
    result = apply_deterministic_overrides(output, "")
    assert [p.name for p in result.projects] == ["HRMS"]


def test_education_single_year_not_borrowed_from_prior_row():
    from app.models.resume import EducationalDetail
    raw = (
        "EDUCATION\n"
        "Bachelor of Engineering\n"
        "Oriental Institute of Science & Technology, Bhopal\n"
        "2015 - 2019\t76.3%\n"
        "Higher Secondary\n"
        "KENDRIYA VIDHYALAYA\n"
        "2015\tCBSE Board : 74.8%\n"
    )
    output = ResumeOutput(educationalDetails=[
        EducationalDetail(degree="Bachelor of Engineering",
                          institution="Oriental Institute of Science & Technology, Bhopal",
                          startDate="2015-01-01", endDate="2019-01-01"),
        EducationalDetail(degree="Higher Secondary", institution="KENDRIYA VIDHYALAYA",
                          startDate="2015-01-01", endDate="2019-01-01"),
    ])
    result = apply_deterministic_overrides(output, raw)
    be, hs = result.educationalDetails
    assert (be.startDate, be.endDate) == ("2015-01-01", "2019-01-01")  # real range kept
    assert (hs.startDate, hs.endDate) == (None, "2015-01-01")           # single passing year


def test_looks_truncated_detects_cutoff():
    from app.parser.chunked_processor import _looks_truncated
    assert _looks_truncated('{"skills":["Ja') is True       # cut mid-array
    assert _looks_truncated('{"a":1}') is False              # complete
    assert _looks_truncated('{"a":1}\n```') is False         # complete, fenced
    assert _looks_truncated(None) is False


def test_harvest_fills_empty_skills_from_experience():
    from app.models.resume import ExperienceDetail
    output = ResumeOutput(
        experienceDetails=[ExperienceDetail(title="Dev", skillsUsed="MongoDB, Node.js, Express")]
    )
    result = apply_deterministic_overrides(output, "")
    assert [s.skillName for s in result.skills] == ["MongoDB", "Node.js", "Express"]


def test_harvest_does_not_override_existing_skills():
    from app.models.resume import ExperienceDetail, SkillDetail
    output = ResumeOutput(
        skills=[SkillDetail(skillName="Python")],
        experienceDetails=[ExperienceDetail(title="Dev", skillsUsed="MongoDB, Node.js")],
    )
    result = apply_deterministic_overrides(output, "")
    assert [s.skillName for s in result.skills] == ["Python"]


def test_phone_conflict_prefers_source_phone():
    output = ResumeOutput(
        personalDetails=PersonalDetails(phone="+91 99999 99999")
    )

    result = apply_deterministic_overrides(
        output,
        "Deepak Tiwari\nPhone: +91 98765 43210",
    )

    # Source phone wins over the LLM's conflicting value, then is canonicalized
    # to the consistent '+CC NNNNNNNNNN' form (inner spaces stripped).
    assert result.personalDetails.phone == "+91 9876543210"


def test_known_indian_city_corrects_state_and_country():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            city="Delhi",
            state="Maharashtra",
            country="United States",
        )
    )

    result = apply_deterministic_overrides(output, "Location: Delhi")

    assert result.personalDetails.state == "Delhi"
    assert result.personalDetails.country == "India"


def test_grounding_clears_unsupported_extended_personal_fields():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Deepak",
            lastName="Tiwari",
            gender="Male",
            dateOfBirth="1990-01-01",
            nationality="Indian",
            maritalStatus="Single",
            address="Imaginary Road",
            hobbies="Skydiving",
            declaration="I declare everything is true.",
        )
    )

    result = apply_grounding(output, "Deepak Tiwari\nSoftware Engineer")

    assert result.personalDetails.gender == ""
    assert result.personalDetails.dateOfBirth == ""
    assert result.personalDetails.nationality == ""
    assert result.personalDetails.maritalStatus == ""
    assert result.personalDetails.address == ""
    assert result.personalDetails.hobbies == ""
    assert result.personalDetails.declaration == ""


def test_grounding_keeps_labelled_extended_personal_fields():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Deepak",
            lastName="Tiwari",
            gender="Male",
            dateOfBirth="1990-01-01",
            nationality="Indian",
            maritalStatus="Single",
            address="12 MG Road, Delhi",
            hobbies="Cricket, Reading",
            declaration="I declare the information is true.",
        )
    )
    raw = """Deepak Tiwari
Gender: Male
Date of Birth: 01 January 1990
Nationality: Indian
Marital Status: Single
Address: 12 MG Road, Delhi
Hobbies: Cricket, Reading
Declaration: I declare the information is true.
"""

    result = apply_grounding(output, raw)

    assert result.personalDetails.gender == "Male"
    assert result.personalDetails.dateOfBirth == "1990-01-01"
    assert result.personalDetails.nationality == "Indian"
    assert result.personalDetails.maritalStatus == "Single"
    assert result.personalDetails.address == "12 MG Road, Delhi"
    assert result.personalDetails.hobbies == "Cricket, Reading"
    assert result.personalDetails.declaration == "I declare the information is true."


def test_grounding_drops_project_not_supported_by_resume():
    output = ResumeOutput(
        projects=[
            ProjectDetail(
                name="Invented Banking Platform",
                description="Built fictional payment services.",
            )
        ]
    )

    result = apply_grounding(output, "Deepak Tiwari\nExperience: Software Engineer")

    assert result.projects == []


def test_grounding_clears_unsupported_project_fields():
    output = ResumeOutput(
        projects=[
            ProjectDetail(
                name="Job Board",
                description="Built a job board with FastAPI.",
                technologies="FastAPI",
                role="Technical Lead",
                teamSize="12",
            )
        ]
    )
    raw = """Projects
Job Board
Built a job board with FastAPI.
Technologies: FastAPI
"""

    result = apply_grounding(output, raw)

    assert len(result.projects) == 1
    assert result.projects[0].description == "Built a job board with FastAPI."
    assert result.projects[0].technologies == "FastAPI"
    assert result.projects[0].role == ""
    assert result.projects[0].teamSize == ""


def test_grounding_clears_unsupported_location():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Deepak",
            lastName="Tiwari",
            city="Delhi",
            state="Delhi",
            country="India",
        )
    )

    result = apply_grounding(output, "Deepak Tiwari\nSoftware Engineer")

    assert result.personalDetails.city == ""
    assert result.personalDetails.state == ""
    assert result.personalDetails.country == ""


def test_grounding_clears_unsupported_state_without_city():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Deepak",
            lastName="Tiwari",
            state="Maharashtra",
            country="India",
        )
    )

    result = apply_grounding(output, "Deepak Tiwari\nSoftware Engineer")

    assert result.personalDetails.state == ""
    assert result.personalDetails.country == ""


def test_grounding_clears_fabricated_headline():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Abhinandan",
            headline="Senior Java Developer | 8 Years Experience",
        )
    )
    raw = "Abhinandan S\nMongoDB and NodeJS engineer with 10 years experience."
    result = apply_grounding(output, raw)
    assert result.personalDetails.headline == ""


def test_grounding_keeps_grounded_headline():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Priya",
            headline="Full Stack Developer",
        )
    )
    raw = "Priya Sharma\nFull Stack Developer\nExperienced in React and Node."
    result = apply_grounding(output, raw)
    assert result.personalDetails.headline == "Full Stack Developer"


def test_grounding_keeps_nationality_derived_from_grounded_country():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            city="Bangalore", state="Karnataka", country="India",
            nationality="Indian",
        )
    )
    raw = "Resume\nLocation: Bangalore 560037\nSoftware Engineer"
    result = apply_grounding(output, raw)
    # nationality is the correct demonym of a grounded country — kept without a label
    assert result.personalDetails.nationality == "Indian"
