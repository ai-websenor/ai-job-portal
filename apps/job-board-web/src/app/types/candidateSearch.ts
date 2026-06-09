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
