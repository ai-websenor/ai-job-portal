import type { AxiosRequestConfig } from 'axios';
import ENDPOINTS from './endpoints';
import http from './http';
import type {
  CandidateFilters,
  CandidateProfileResponse,
  CandidateResumeDownloadResponse,
  CandidateSearchResponse,
  CandidateSkillOption,
} from '../types/candidateSearch';

export const buildCandidateSearchParams = (filters: CandidateFilters) => {
  const params = new URLSearchParams();

  if (filters.query.trim()) params.set('query', filters.query.trim());
  if (filters.location.trim()) params.set('location', filters.location.trim());
  if (filters.experienceLevels.length) {
    params.set('experienceLevels', filters.experienceLevels.join(','));
  }
  if (filters.salaryMin != null) params.set('salaryMin', String(filters.salaryMin));
  if (filters.salaryMax != null) params.set('salaryMax', String(filters.salaryMax));
  if (filters.employmentTypes.length) {
    params.set('employmentTypes', filters.employmentTypes.join(','));
  }
  if (filters.availability.length) params.set('availability', filters.availability.join(','));
  if (filters.skillIds.length) params.set('skillIds', filters.skillIds.join(','));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);

  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));

  return params;
};

export const searchCandidates = (
  filters: CandidateFilters,
  config?: Pick<AxiosRequestConfig, 'signal'>,
) =>
  http.get<any, CandidateSearchResponse>(ENDPOINTS.EMPLOYER.CANDIDATES.SEARCH, {
    params: buildCandidateSearchParams(filters),
    ...config,
  });

export const getSavedCandidates = (
  page: number,
  limit: number,
  config?: Pick<AxiosRequestConfig, 'signal'>,
) =>
  http.get<any, CandidateSearchResponse>(ENDPOINTS.EMPLOYER.CANDIDATES.SAVED, {
    params: { page, limit },
    ...config,
  });

export const saveCandidate = (profileId: string, note?: string) =>
  http.post(ENDPOINTS.EMPLOYER.CANDIDATES.SAVED, { profileId, ...(note ? { note } : {}) });

export const unsaveCandidate = (profileId: string) =>
  http.delete(ENDPOINTS.EMPLOYER.CANDIDATES.SAVED_PROFILE(profileId));

export const getCandidateProfile = (
  profileId: string,
  applicationId?: string,
  config?: Pick<AxiosRequestConfig, 'signal'>,
) =>
  http.get<any, { data: CandidateProfileResponse }>(
    ENDPOINTS.EMPLOYER.CANDIDATES.PROFILE(profileId, applicationId),
    config,
  );

export const downloadCandidateResume = (profileId: string) =>
  http.get<any, CandidateResumeDownloadResponse>(ENDPOINTS.EMPLOYER.CANDIDATES.RESUME(profileId));

export const getCandidateSkillOptions = async (search: string) => {
  const response = await http.get<any, { data: CandidateSkillOption[] }>(
    ENDPOINTS.MASTER_DATA.SKILLS,
    {
      params: search.trim() ? { search: search.trim() } : undefined,
    },
  );

  return response?.data ?? [];
};
