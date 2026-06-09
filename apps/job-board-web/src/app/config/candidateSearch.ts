import type {
  CandidateAvailability,
  CandidateEmploymentType,
  CandidateExperienceLevel,
  CandidateFilterOption,
  CandidateSortBy,
} from '../types/candidateSearch';

export const candidateExperienceOptions: CandidateFilterOption<CandidateExperienceLevel>[] = [
  { value: '0-1', label: '0-1 yr' },
  { value: '1-2', label: '1-2 yrs' },
  { value: '3-5', label: '3-5 yrs' },
  { value: '5-10', label: '5-10 yrs' },
  { value: '10+', label: '10+ yrs' },
];

export const candidateEmploymentOptions: CandidateFilterOption<CandidateEmploymentType>[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

export const candidateAvailabilityOptions: CandidateFilterOption<CandidateAvailability>[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: '15d', label: 'Within 15 Days' },
  { value: '30d', label: 'Within 30 Days' },
  { value: 'notice', label: 'Serving Notice' },
];

export const candidateSortOptions: CandidateFilterOption<CandidateSortBy>[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'experience', label: 'Experience' },
  { value: 'salary', label: 'Expected Salary' },
];

export const candidateLabelMaps = {
  experienceLevels: Object.fromEntries(
    candidateExperienceOptions.map((item) => [item.value, item.label]),
  ) as Record<CandidateExperienceLevel, string>,
  employmentTypes: Object.fromEntries(
    candidateEmploymentOptions.map((item) => [item.value, item.label]),
  ) as Record<CandidateEmploymentType, string>,
  availability: Object.fromEntries(
    candidateAvailabilityOptions.map((item) => [item.value, item.label]),
  ) as Record<CandidateAvailability, string>,
  sortBy: Object.fromEntries(candidateSortOptions.map((item) => [item.value, item.label])) as Record<
    CandidateSortBy,
    string
  >,
};
