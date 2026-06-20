import type {
  ICertification,
  IEducationRecord,
  IJobPreferences,
  IProfileSkill,
  IUser,
  IWorkExperience,
} from './types';

export type CandidateExperienceLevel = '0-1' | '1-2' | '3-5' | '5-10' | '10+';

export type CandidateEmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

export type CandidateAvailability = 'immediate' | '15d' | '30d' | 'notice';

export type CandidateSortBy = 'relevance' | 'recent' | 'experience' | 'salary';

export type CandidateFilters = {
  query: string;
  location: string;
  experienceLevels: CandidateExperienceLevel[];
  salaryMin?: number;
  salaryMax?: number;
  employmentTypes: CandidateEmploymentType[];
  availability: CandidateAvailability[];
  skillIds: string[];
  sortBy: CandidateSortBy;
  page: number;
  limit: number;
};

export type CandidateProfileCard = {
  profileId: string;
  name: string | null;
  headline: string | null;
  location: string | null;
  profilePhoto: string | null;
  totalExperienceYears: string | null;
  expectedSalaryMin: string | null;
  expectedSalaryMax: string | null;
  salaryCurrency: string | null;
  noticePeriodDays: number | null;
  availability: string | null;
  skills: string[];
  isSaved: boolean;
  // True when the employer already spent a profile_access credit on this candidate.
  isUnlocked?: boolean;
  resume?: CandidateProfileResume | null;
};

export type ProfileAccessSummary = {
  limit: number;
  used: number;
  remaining: number;
  hasActiveSubscription: boolean;
  viewContactAllowed: boolean;
  messageAllowed: boolean;
};

export type CandidateProfileAccess = {
  unlocked: boolean;
  contactVisible: boolean;
  canViewContact: boolean;
  canMessage: boolean;
  contactLocked: boolean;
  limitReached: boolean;
};

export type CandidatePagination = {
  totalCandidate: number;
  pageCount: number;
  currentPage: number;
  hasNextPage: boolean;
};

export type CandidateSearchResponse = {
  message?: string;
  data: CandidateProfileCard[];
  pagination: CandidatePagination;
};

export type CandidateSkillOption = {
  id: string;
  name: string;
};

export type CandidateFilterOption<TValue extends string = string> = {
  value: TValue;
  label: string;
};

export type CandidateProfile = Omit<
  Partial<IUser>,
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'headline'
  | 'professionalSummary'
  | 'totalExperienceYears'
  | 'city'
  | 'state'
  | 'country'
  | 'profilePhoto'
  | 'visibility'
> & {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  headline: string | null;
  professionalSummary: string | null;
  totalExperienceYears: string | number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  profilePhoto: string | null;
  visibility: string;
};

export type CandidateProfileApplication = {
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobTitle: string | null;
  status: string;
  appliedAt: string;
  resumeUrl: string | null;
  resumeId: string | null;
  coverLetter: string | null;
  threadId: string | null;
};

export type CandidateProfileResume = {
  id: string;
  fileName: string;
  resumeName: string | null;
  fileType: string;
  fileSize: number | null;
  updatedAt: string;
  isDownloaded: boolean;
};

export type CandidateProfileSkill = Partial<IProfileSkill> & {
  skillName?: string;
  category?: string;
};

export type CandidateProfileResponse = {
  threadId: string | null;
  profile: CandidateProfile;
  workExperiences: Array<Partial<IWorkExperience>>;
  educationRecords: Array<Partial<IEducationRecord>>;
  certifications: Array<Partial<ICertification>>;
  skills: CandidateProfileSkill[];
  jobPreferences: Partial<IJobPreferences> | null;
  application: CandidateProfileApplication | null;
  resume?: CandidateProfileResume | null;
  videoResume: { url: string; status: string } | null;
  access?: CandidateProfileAccess;
};

export type CandidateResumeDownloadResponse = {
  message?: string;
  data: {
    id: string;
    fileName: string;
    resumeName: string | null;
    fileType: string;
    fileSize: number | null;
    url: string;
  };
};
