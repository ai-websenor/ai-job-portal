from pydantic import BaseModel
from typing import Optional


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


PERSONAL_DETAIL_FIELDS = tuple(PersonalDetails.model_fields)


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
    description: str = ""
    achievements: str = ""
    skillsUsed: str = ""  # comma-separated


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
