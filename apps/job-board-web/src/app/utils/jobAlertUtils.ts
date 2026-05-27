import { searchJobDefaultValues } from '../config/data';
import CommonUtils from './commonUtils';

export const SAVED_SEARCH_LIMIT = 5;

export const ALERT_FREQUENCIES = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'Immediately when a matching job is published',
  },
  {
    value: 'daily',
    label: 'Daily',
    description: 'Every day at 8:00 AM',
  },
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Every Monday at 8:00 AM',
  },
] as const;

export const ALERT_CHANNELS = [
  {
    value: 'email',
    label: 'Email',
  },
  {
    value: 'push',
    label: 'Push',
  },
] as const;

type SearchCriteria = {
  keyword?: string;
  location?: string;
  city?: string;
  state?: string;
  categoryId?: string;
  jobType?: string[];
  workMode?: string[];
  skills?: string[];
  salaryMin?: number;
  salaryMax?: number;
};

export type JobAlertSearchFilters = Partial<typeof searchJobDefaultValues> & {
  city?: string;
  state?: string;
  skills?: string[];
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const addTrimmedValue = (
  criteria: SearchCriteria,
  key: keyof SearchCriteria,
  value: unknown,
) => {
  if (typeof value !== 'string') return;

  const trimmedValue = value.trim();
  if (trimmedValue) {
    (criteria[key] as string) = trimmedValue;
  }
};

export const buildSearchCriteriaObject = (filters: JobAlertSearchFilters): SearchCriteria => {
  const criteria: SearchCriteria = {};

  addTrimmedValue(criteria, 'keyword', filters.query);
  addTrimmedValue(criteria, 'location', filters.location);
  addTrimmedValue(criteria, 'city', filters.city);
  addTrimmedValue(criteria, 'state', filters.state);
  addTrimmedValue(criteria, 'categoryId', filters.categoryId);

  const jobType = toStringArray(filters.jobType);
  if (jobType.length) {
    criteria.jobType = jobType;
  }

  const workMode = Array.from(
    new Set([...toStringArray(filters.workModes), ...toStringArray(filters.locationType)]),
  );
  if (workMode.length) {
    criteria.workMode = workMode;
  }

  const skills = toStringArray(filters.skills);
  if (skills.length) {
    criteria.skills = skills;
  }

  const salaryMin = Number(filters.salaryMin);
  if (
    Number.isFinite(salaryMin) &&
    salaryMin > Number(searchJobDefaultValues.salaryMin)
  ) {
    criteria.salaryMin = salaryMin;
  }

  const salaryMax = Number(filters.salaryMax);
  if (
    Number.isFinite(salaryMax) &&
    salaryMax < Number(searchJobDefaultValues.salaryMax)
  ) {
    criteria.salaryMax = salaryMax;
  }

  return criteria;
};

export const buildSearchCriteria = (filters: JobAlertSearchFilters) =>
  JSON.stringify(buildSearchCriteriaObject(filters));

export const hasActiveSearchCriteria = (filters: JobAlertSearchFilters) =>
  Object.keys(buildSearchCriteriaObject(filters)).length > 0;

export const generateAlertName = (filters: JobAlertSearchFilters) => {
  const parts: string[] = [];
  const query = filters.query?.trim();
  const location = filters.location?.trim();
  const jobType = toStringArray(filters.jobType);
  const workMode = toStringArray(filters.workModes);
  const locationType = toStringArray(filters.locationType);

  if (query) parts.push(query);
  if (location) parts.push(location);
  if (jobType.includes('full_time')) parts.push('Full-time');
  if ([...workMode, ...locationType].includes('remote')) parts.push('Remote');
  if (!parts.length) parts.push('All Jobs');

  return parts.join(' - ').slice(0, 80);
};

export const parseSavedSearchCriteria = (searchCriteria: string): SearchCriteria => {
  try {
    const parsedCriteria = JSON.parse(searchCriteria);
    return parsedCriteria && typeof parsedCriteria === 'object' && !Array.isArray(parsedCriteria)
      ? parsedCriteria
      : {};
  } catch {
    return {};
  }
};

const formatSalary = (salaryMin?: number, salaryMax?: number) => {
  if (salaryMin != null && salaryMax != null) {
    return `Rs ${salaryMin} - Rs ${salaryMax}`;
  }

  if (salaryMin != null) {
    return `From Rs ${salaryMin}`;
  }

  if (salaryMax != null) {
    return `Up to Rs ${salaryMax}`;
  }

  return '';
};

export const formatSavedSearchCriteria = (searchCriteria: string) => {
  const criteria = parseSavedSearchCriteria(searchCriteria);
  const summary: string[] = [];

  if (criteria.keyword) summary.push(criteria.keyword);
  if (criteria.location) summary.push(criteria.location);
  if (criteria.city) summary.push(criteria.city);
  if (criteria.state) summary.push(criteria.state);
  if (criteria.categoryId) summary.push('Category selected');

  if (criteria.jobType?.length) {
    summary.push(criteria.jobType.map((type) => CommonUtils.keyIntoTitle(type)).join(', '));
  }

  if (criteria.workMode?.length) {
    summary.push(criteria.workMode.map((mode) => CommonUtils.keyIntoTitle(mode)).join(', '));
  }

  if (criteria.skills?.length) {
    summary.push(criteria.skills.join(', '));
  }

  const salary = formatSalary(criteria.salaryMin, criteria.salaryMax);
  if (salary) summary.push(salary);

  return summary.length ? summary : ['All jobs'];
};

export const parseAlertChannels = (alertChannels: string) => {
  const channels = toStringArray(alertChannels);
  return channels.length ? channels : ['email'];
};

export const formatAlertChannels = (alertChannels: string) =>
  parseAlertChannels(alertChannels)
    .map((channel) => CommonUtils.keyIntoTitle(channel))
    .join(' + ');
