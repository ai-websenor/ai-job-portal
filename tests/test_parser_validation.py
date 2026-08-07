"""Regression tests for deterministic resume-output validation."""

import json
import re
from pathlib import Path

from app.config import Settings
from app.models.resume import (
    CertificationDetail,
    EducationalDetail,
    ExperienceDetail,
    LanguageDetail,
    PersonalDetails,
    ProjectDetail,
    ResumeOutput,
)
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


# ── Harish[5y_0m] SFDC Developer regressions ──────────────────────────────

HARISH_HEADER = (
    "HARISH\n"
    "CERTIFICATE\n"
    "Salesforce Developer\n"
    "CAREER OBJECTIVE\n"
    "EDUCATION\n"
    " Nizamabad, TS.\n"
    " +91 7989823960\n"
    " Hareesherra.sfd@gmail.com\n"
    "WORK EXPERIENCE\n"
    "Worked as a Associate Software Engineer in Futurista Technologies.\n"
    "Worked as a Senior Associate in Wipro Limited.\n"
    "Working as a Senior Software Engineer in GEBB'S Technologies Pvt Ltd.\n"
    "Completed B.Tech in JNTU, Hyderabad.\n"
)


def test_stitched_job_titles_replaced_by_header_headline():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Harish",
            lastName="Errab",
            headline="Associate Software Engineer | Senior Associate | Senior Software Engineer",
        )
    )

    result = apply_grounding(
        apply_deterministic_overrides(output, HARISH_HEADER), HARISH_HEADER
    )

    assert result.personalDetails.headline == "Salesforce Developer"


def test_state_and_country_survive_from_city_and_phone_code():
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Harish", lastName="Errab", city="Nizamabad",
        )
    )

    result = apply_grounding(
        apply_deterministic_overrides(output, HARISH_HEADER), HARISH_HEADER
    )

    pd = result.personalDetails
    # "TS." expands to Telangana and "+91" implies India — neither word is
    # printed on the page, but both are fully supported by what is.
    assert (pd.city, pd.state, pd.country) == ("Nizamabad", "Telangana", "India")


def test_state_survives_for_city_missing_from_the_lookup_table():
    raw = "Ravi Kumar\nBhimavaram, AP\n+91 9876543210\n"
    output = ResumeOutput(
        personalDetails=PersonalDetails(
            firstName="Ravi", lastName="Kumar", city="Bhimavaram",
            state="Andhra Pradesh", country="India",
        )
    )

    result = apply_grounding(apply_deterministic_overrides(output, raw), raw)

    pd = result.personalDetails
    assert (pd.state, pd.country) == ("Andhra Pradesh", "India")


def test_non_numeric_grade_dropped():
    output = ResumeOutput(
        educationalDetails=[
            EducationalDetail(
                degree="B.Tech", institution="JNTU", grade="Passed out in 2007",
            )
        ]
    )

    result = apply_grounding(
        apply_deterministic_overrides(output, HARISH_HEADER), HARISH_HEADER
    )

    assert result.educationalDetails[0].grade == ""
    assert result.educationalDetails[0].gradeType == ""


def test_numeric_grade_normalized_with_type():
    raw = "B.Tech, JNTU Hyderabad — 76.5%\nM.Tech, IIT — CGPA 8.2/10\n"
    output = ResumeOutput(
        educationalDetails=[
            EducationalDetail(degree="B.Tech", institution="JNTU", grade="76.5%"),
            EducationalDetail(degree="M.Tech", institution="IIT", grade="CGPA 8.2/10"),
        ]
    )

    result = apply_grounding(apply_deterministic_overrides(output, raw), raw)

    assert (result.educationalDetails[0].grade, result.educationalDetails[0].gradeType) == (
        "76.5", "percentage",
    )
    assert (result.educationalDetails[1].grade, result.educationalDetails[1].gradeType) == (
        "8.2", "cgpa",
    )


def test_hallucinated_grade_absent_from_source_dropped():
    raw = "B.Tech, JNTU Hyderabad\nGraduated 2007\n"
    output = ResumeOutput(
        educationalDetails=[
            EducationalDetail(degree="B.Tech", institution="JNTU", grade="8.5", gradeType="cgpa")
        ]
    )

    result = apply_grounding(apply_deterministic_overrides(output, raw), raw)

    assert result.educationalDetails[0].grade == ""
    assert result.educationalDetails[0].gradeType == ""


def test_fabricated_language_dropped():
    output = ResumeOutput(languages=[LanguageDetail(name="English", proficiency="")])

    result = apply_grounding(output, HARISH_HEADER)

    assert result.languages == []


def test_stated_languages_survive():
    output = ResumeOutput(
        languages=[
            LanguageDetail(name="English", proficiency="Fluent"),
            LanguageDetail(name="Hindi", proficiency="Native"),
        ]
    )
    raw = "LANGUAGES KNOWN\nEnglish - Fluent\nHindi - Native\n"

    result = apply_grounding(output, raw)

    assert [l.name for l in result.languages] == ["English", "Hindi"]


def test_certification_issuer_echoing_its_own_name_cleared():
    output = ResumeOutput(
        certifications=[
            CertificationDetail(
                name="Certified Platform Salesforce Developer",
                issuingOrganization="Certified Platform Salesforce Developer",
            )
        ]
    )

    result = apply_deterministic_overrides(output, HARISH_HEADER)

    assert result.certifications[0].issuingOrganization == ""


def test_unstated_employment_type_cleared_but_stated_one_kept():
    output = ResumeOutput(
        experienceDetails=[
            ExperienceDetail(title="Senior Associate", companyName="Wipro Limited",
                             employmentType="full_time"),
        ]
    )
    assert apply_grounding(output, HARISH_HEADER).experienceDetails[0].employmentType == ""

    stated = ResumeOutput(
        experienceDetails=[
            ExperienceDetail(title="Intern", companyName="Acme", employmentType="internship")
        ]
    )
    raw = "Software Development Internship at Acme, 6 months.\n"
    assert apply_grounding(stated, raw).experienceDetails[0].employmentType == "internship"


def test_present_tense_role_marked_current_end_to_end():
    output = ResumeOutput(
        experienceDetails=[
            ExperienceDetail(title="Senior Associate", companyName="Wipro Limited"),
            ExperienceDetail(title="Senior Software Engineer",
                             companyName="GEBB'S Technologies Pvt Ltd"),
        ]
    )

    result = apply_deterministic_overrides(output, HARISH_HEADER)

    assert [e.isCurrent for e in result.experienceDetails] == [False, True]
