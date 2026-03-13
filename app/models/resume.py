from pydantic import BaseModel
from typing import Optional


class ConfidenceField(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0


class PersonalInfo(BaseModel):
    name: ConfidenceField = ConfidenceField()
    first_name: ConfidenceField = ConfidenceField()
    last_name: ConfidenceField = ConfidenceField()
    email: ConfidenceField = ConfidenceField()
    phone: ConfidenceField = ConfidenceField()
    address: ConfidenceField = ConfidenceField()
    city: ConfidenceField = ConfidenceField()
    state: ConfidenceField = ConfidenceField()
    country: ConfidenceField = ConfidenceField()
    linkedin: ConfidenceField = ConfidenceField()
    github: ConfidenceField = ConfidenceField()
    website: ConfidenceField = ConfidenceField()
    summary: ConfidenceField = ConfidenceField()
    headline: ConfidenceField = ConfidenceField()
    date_of_birth: ConfidenceField = ConfidenceField()
    gender: ConfidenceField = ConfidenceField()
    nationality: ConfidenceField = ConfidenceField()
    marital_status: ConfidenceField = ConfidenceField()
    declaration: ConfidenceField = ConfidenceField()


class Experience(BaseModel):
    company: ConfidenceField = ConfidenceField()
    role: ConfidenceField = ConfidenceField()
    location: ConfidenceField = ConfidenceField()
    start_date: ConfidenceField = ConfidenceField()
    end_date: ConfidenceField = ConfidenceField()
    description: ConfidenceField = ConfidenceField()
    skills_used: list[str] = []


class Education(BaseModel):
    institution: ConfidenceField = ConfidenceField()
    degree: ConfidenceField = ConfidenceField()
    field: ConfidenceField = ConfidenceField()
    year: ConfidenceField = ConfidenceField()
    grade: ConfidenceField = ConfidenceField()
    description: ConfidenceField = ConfidenceField()


class Certification(BaseModel):
    name: ConfidenceField = ConfidenceField()
    issuer: ConfidenceField = ConfidenceField()
    year: ConfidenceField = ConfidenceField()


class Project(BaseModel):
    name: ConfidenceField = ConfidenceField()
    client: ConfidenceField = ConfidenceField()
    role: ConfidenceField = ConfidenceField()
    description: ConfidenceField = ConfidenceField()
    responsibilities: ConfidenceField = ConfidenceField()
    technologies: ConfidenceField = ConfidenceField()
    url: ConfidenceField = ConfidenceField()


class Achievement(BaseModel):
    title: ConfidenceField = ConfidenceField()
    year: ConfidenceField = ConfidenceField()


class Publication(BaseModel):
    title: ConfidenceField = ConfidenceField()
    publisher: ConfidenceField = ConfidenceField()
    year: ConfidenceField = ConfidenceField()
    url: ConfidenceField = ConfidenceField()


class Language(BaseModel):
    name: ConfidenceField = ConfidenceField()
    proficiency: ConfidenceField = ConfidenceField()


class ResumeOutput(BaseModel):
    personal: PersonalInfo = PersonalInfo()
    experience: list[Experience] = []
    education: list[Education] = []
    skills: list[ConfidenceField] = []
    certifications: list[Certification] = []
    projects: list[Project] = []
    achievements: list[Achievement] = []
    publications: list[Publication] = []
    languages: list[Language] = []
    hobbies: list[ConfidenceField] = []
