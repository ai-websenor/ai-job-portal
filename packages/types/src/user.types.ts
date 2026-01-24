import { UserRole, ProfileVisibility, SkillProficiency } from './enums';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  passwordSalt?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  headline?: string;
  summary?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  visibility: ProfileVisibility;
  isOpenToWork: boolean;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  salaryCurrency?: string;
  noticePeriodDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateExperience {
  id: string;
  candidateProfileId: string;
  companyName: string;
  title: string;
  employmentType: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  description?: string;
  createdAt: Date;
}

export interface CandidateEducation {
  id: string;
  candidateProfileId: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: Date;
  endDate?: Date;
  grade?: string;
  description?: string;
  createdAt: Date;
}

export interface CandidateSkill {
  id: string;
  candidateProfileId: string;
  skillId: string;
  proficiency: SkillProficiency;
  yearsOfExperience?: number;
  isVerified: boolean;
}

export interface CandidateResume {
  id: string;
  candidateProfileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  parsedData?: Record<string, unknown>;
  createdAt: Date;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  companyName: string;
  companySlug: string;
  companyLogo?: string;
  industry?: string;
  companySize?: string;
  foundedYear?: number;
  website?: string;
  description?: string;
  headquarters?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
