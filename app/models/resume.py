from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class ConfidenceField(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0


class PersonalInfo(BaseModel):
    name: ConfidenceField = ConfidenceField()
    email: ConfidenceField = ConfidenceField()
    phone: ConfidenceField = ConfidenceField()
    address: ConfidenceField = ConfidenceField()
    linkedin: ConfidenceField = ConfidenceField()


class Experience(BaseModel):
    company: ConfidenceField = ConfidenceField()
    role: ConfidenceField = ConfidenceField()
    start_date: ConfidenceField = ConfidenceField()
    end_date: ConfidenceField = ConfidenceField()
    description: ConfidenceField = ConfidenceField()


class Education(BaseModel):
    institution: ConfidenceField = ConfidenceField()
    degree: ConfidenceField = ConfidenceField()
    field: ConfidenceField = ConfidenceField()
    year: ConfidenceField = ConfidenceField()


class Certification(BaseModel):
    name: ConfidenceField = ConfidenceField()
    issuer: ConfidenceField = ConfidenceField()
    year: ConfidenceField = ConfidenceField()


class ResumeOutput(BaseModel):
    personal: PersonalInfo = PersonalInfo()
    experience: list[Experience] = []
    education: list[Education] = []
    skills: list[ConfidenceField] = []
    certifications: list[Certification] = []
