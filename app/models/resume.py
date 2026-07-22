import re
from pydantic import BaseModel, field_validator
from typing import Optional


def _to_bullet_list(value) -> list[str]:
    """Normalize a description value to a list of bullet strings.

    Accepts an already-split list, or a legacy single string joined by '; '
    / newlines / bullet glyphs, or None. Splits, trims, and drops empties so the
    field is always a clean list regardless of what the LLM emitted."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    s = str(value).strip()
    if not s:
        return []
    parts = re.split(r"\s*;\s*|[\r\n]+|\s*[•▪◦‣·*]\s+", s)
    return [p.strip(" ;•▪◦‣·*-\t").strip() for p in parts if p.strip(" ;•▪◦‣·*-\t").strip()]


class PersonalDetails(BaseModel):
    firstName: str = ""
    lastName: str = ""
    phone: str = ""
    email: str = ""
    headline: str = ""
    professionalSummary: str = ""
    country: str = ""
    state: str = ""
    city: str = ""
    linkedin: str = ""
    github: str = ""
    website: str = ""
    gender: str = ""  # Male/Female/Other or empty
    dateOfBirth: str = ""
    nationality: str = ""
    maritalStatus: str = ""
    address: str = ""
    hobbies: str = ""
    declaration: str = ""


class EducationalDetail(BaseModel):
    degree: str = ""
    institution: str = ""
    fieldOfStudy: str = ""
    startDate: Optional[str] = None  # YYYY-MM-DD
    endDate: Optional[str] = None  # YYYY-MM-DD
    grade: str = ""
    currentlyStudying: bool = False


class SkillDetail(BaseModel):
    skillName: str = ""
    proficiencyLevel: str = ""  # beginner|intermediate|advanced|expert, empty if resume doesn't state it
    yearsOfExperience: Optional[int] = None


class ExperienceDetail(BaseModel):
    title: str = ""
    designation: str = ""  # same as title unless resume distinguishes
    companyName: str = ""
    employmentType: str = ""  # full_time|part_time|contract|internship|freelance, empty if resume doesn't state it
    location: str = ""
    startDate: Optional[str] = None  # YYYY-MM-DD
    endDate: Optional[str] = None  # YYYY-MM-DD, null if current
    isCurrent: bool = False
    description: list[str] = []  # one entry per responsibility bullet
    achievements: str = ""
    skillsUsed: str = ""  # comma-separated

    @field_validator("description", mode="before")
    @classmethod
    def _coerce_description(cls, v):
        return _to_bullet_list(v)


class CertificationDetail(BaseModel):
    name: str = ""
    issuingOrganization: str = ""
    issueDate: Optional[str] = None  # YYYY-MM-DD
    expiryDate: Optional[str] = None
    credentialId: str = ""
    credentialUrl: str = ""


class ProjectDetail(BaseModel):
    name: str = ""
    description: str = ""
    technologies: str = ""
    url: str = ""
    role: str = ""
    duration: str = ""
    teamSize: str = ""
    responsibilities: str = ""


class LanguageDetail(BaseModel):
    name: str = ""
    proficiency: str = ""


class ResumeOutput(BaseModel):
    personalDetails: PersonalDetails = PersonalDetails()
    educationalDetails: list[EducationalDetail] = []
    skills: list[SkillDetail] = []
    experienceDetails: list[ExperienceDetail] = []
    certifications: list[CertificationDetail] = []
    projects: list[ProjectDetail] = []
    languages: list[LanguageDetail] = []
