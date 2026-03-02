import { faker } from '@faker-js/faker';

export interface UserFixture {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'candidate' | 'employer' | 'admin';
  mobile: string;
}

export interface CandidateProfileFixture {
  firstName: string;
  lastName: string;
  phone?: string;
  headline?: string;
  summary?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
}

export interface ExperienceFixture {
  companyName: string;
  title: string;
  employmentType?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface EducationFixture {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  level?: string;
  startDate: string;
  endDate?: string;
  grade?: string;
  currentlyStudying?: boolean;
}

export interface EmployerProfileFixture {
  companyName?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  description?: string;
}

/**
 * Generate a valid mobile number matching the pattern: ^\+?[1-9]\d{9,14}$
 */
function generateMobile(): string {
  return `+1${faker.string.numeric(10)}`;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate candidate user
 */
export function generateCandidate(): UserFixture {
  return {
    email: `test_candidate_${faker.string.alphanumeric(8)}@test.com`,
    password: 'TestPass123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'candidate',
    mobile: generateMobile(),
  };
}

/**
 * Generate employer user
 */
export function generateEmployer(): UserFixture {
  return {
    email: `test_employer_${faker.string.alphanumeric(8)}@test.com`,
    password: 'TestPass123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'employer',
    mobile: generateMobile(),
  };
}

/**
 * Generate admin user
 */
export function generateAdmin(): UserFixture {
  return {
    email: `test_admin_${faker.string.alphanumeric(8)}@test.com`,
    password: 'AdminPass123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'admin',
    mobile: generateMobile(),
  };
}

/**
 * Generate candidate profile (matches CreateCandidateProfileDto)
 */
export function generateCandidateProfile(): CandidateProfileFixture {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: generateMobile(),
    headline: faker.person.jobTitle(),
    summary: faker.lorem.paragraph(),
    locationCity: faker.location.city(),
    locationState: faker.location.state(),
    locationCountry: faker.location.country(),
  };
}

/**
 * Generate work experience (matches AddExperienceDto)
 */
export function generateExperience(isCurrent: boolean = false): ExperienceFixture {
  const startDate = faker.date.past({ years: 5 });
  const endDate = isCurrent ? undefined : faker.date.between({ from: startDate, to: new Date() });

  return {
    companyName: faker.company.name(),
    title: faker.person.jobTitle(),
    employmentType: faker.helpers.arrayElement([
      'full_time',
      'part_time',
      'contract',
      'internship',
    ]),
    location: faker.location.city(),
    startDate: formatDate(startDate),
    endDate: endDate ? formatDate(endDate) : undefined,
    isCurrent,
    description: faker.lorem.paragraph(),
  };
}

/**
 * Generate education (matches AddEducationDto)
 */
export function generateEducation(): EducationFixture {
  const startYear = faker.number.int({ min: 2010, max: 2020 });
  const endYear = startYear + faker.number.int({ min: 2, max: 4 });

  return {
    institution: `${faker.company.name()} University`,
    degree: faker.helpers.arrayElement([
      'Bachelor of Science',
      'Master of Science',
      'PhD',
      'Associate Degree',
    ]),
    fieldOfStudy: faker.helpers.arrayElement([
      'Computer Science',
      'Engineering',
      'Business Administration',
      'Mathematics',
      'Physics',
    ]),
    level: faker.helpers.arrayElement([
      'high_school',
      'bachelors',
      'masters',
      'phd',
      'diploma',
      'certificate',
    ]),
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-05-01`,
    grade: faker.helpers.arrayElement(['A', 'A-', 'B+', 'B', '3.8 GPA', '3.5 GPA']),
    currentlyStudying: false,
  };
}

/**
 * Generate employer profile (matches CreateEmployerProfileDto)
 */
export function generateEmployerProfile(): EmployerProfileFixture {
  return {
    companyName: faker.company.name(),
    website: faker.internet.url(),
    industry: faker.helpers.arrayElement([
      'Technology',
      'Finance',
      'Healthcare',
      'Retail',
      'Manufacturing',
    ]),
    companySize: faker.helpers.arrayElement(['1-10', '11-50', '51-200', '201-500', '500+']),
    description: faker.company.catchPhrase(),
  };
}

/**
 * Generate multiple experiences
 */
export function generateExperiences(count: number): ExperienceFixture[] {
  return Array.from({ length: count }, (_, i) => generateExperience(i === 0));
}

/**
 * Generate multiple education records
 */
export function generateEducations(count: number): EducationFixture[] {
  const results: EducationFixture[] = [];
  let currentStartYear = 2010;

  for (let i = 0; i < count; i++) {
    const duration = faker.number.int({ min: 2, max: 4 });
    const endYear = currentStartYear + duration;

    results.push({
      institution: `${faker.company.name()} University`,
      degree: faker.helpers.arrayElement([
        'Bachelor of Science',
        'Master of Science',
        'PhD',
        'Associate Degree',
      ]),
      fieldOfStudy: faker.helpers.arrayElement([
        'Computer Science',
        'Engineering',
        'Business Administration',
        'Mathematics',
        'Physics',
      ]),
      level: faker.helpers.arrayElement([
        'high_school',
        'bachelors',
        'masters',
        'phd',
        'diploma',
        'certificate',
      ]),
      startDate: `${currentStartYear}-09-01`,
      endDate: `${endYear}-05-01`,
      grade: faker.helpers.arrayElement(['A', 'A-', 'B+', 'B', '3.8 GPA', '3.5 GPA']),
      currentlyStudying: false,
    });

    currentStartYear = endYear + 1; // Gap to avoid overlap
  }

  return results;
}
