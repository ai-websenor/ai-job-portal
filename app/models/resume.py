from pydantic import BaseModel
from typing import Optional


class PersonalDetails(BaseModel):
    firstName: str = ""
    lastName: str = ""
    phone: str = ""
    headline: str = ""
    professionalSummary: str = ""
    country: str = ""
    state: str = ""
    city: str = ""
    linkedin: str = ""
    github: str = ""
    website: str = ""
    gender: str = ""  # Male/Female/Other or empty


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
    proficiencyLevel: str = "intermediate"  # beginner|intermediate|advanced|expert
    yearsOfExperience: Optional[int] = None


class ExperienceDetail(BaseModel):
    title: str = ""
    designation: str = ""  # same as title unless resume distinguishes
    companyName: str = ""
    employmentType: str = "full_time"  # full_time|part_time|contract|internship|freelance
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
