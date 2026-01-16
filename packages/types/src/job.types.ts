import { JobStatus, EmploymentType, WorkMode, ExperienceLevel } from './enums';

export interface Job {
  id: string;
  employerProfileId: string;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  showSalary: boolean;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  status: JobStatus;
  viewCount: number;
  applicationCount: number;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  jobCount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface JobSkill {
  id: string;
  jobId: string;
  skillId: string;
  isRequired: boolean;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  categoryId?: string;
  isVerifiable: boolean;
  createdAt: Date;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  createdAt: Date;
}

export interface JobSearchFilters {
  query?: string;
  categoryId?: string;
  employmentType?: EmploymentType[];
  workMode?: WorkMode[];
  experienceLevel?: ExperienceLevel[];
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  skills?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'salary';
}
