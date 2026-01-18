import { faker } from '@faker-js/faker';

export interface JobFixture {
  title: string;
  description: string;
  jobType: string;
  location: string;
  employmentType?: string;
  workMode?: string;
  experienceLevel?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  showSalary?: boolean;
  city?: string;
  state?: string;
  country?: string;
  skills?: string[];
  benefits?: string;
}

export interface CategoryFixture {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

export interface SkillFixture {
  name: string;
  slug: string;
  category?: string;
}

/**
 * Generate job posting (matches CreateJobDto)
 */
export function generateJob(): JobFixture {
  const salaryMin = faker.number.int({ min: 40000, max: 100000 });
  const city = faker.location.city();
  const state = faker.location.state();
  const country = faker.location.country();

  return {
    title: faker.person.jobTitle(),
    description: faker.lorem.paragraphs(3),
    jobType: faker.helpers.arrayElement(['full_time', 'part_time', 'contract', 'freelance']),
    location: `${city}, ${state}, ${country}`,
    employmentType: faker.helpers.arrayElement(['permanent', 'temporary', 'contract']),
    workMode: faker.helpers.arrayElement(['remote', 'on_site', 'hybrid']),
    experienceLevel: faker.helpers.arrayElement(['entry', 'mid', 'senior', 'lead', 'executive']),
    experienceMin: faker.number.int({ min: 0, max: 5 }),
    experienceMax: faker.number.int({ min: 5, max: 15 }),
    salaryMin,
    salaryMax: salaryMin + faker.number.int({ min: 20000, max: 50000 }),
    showSalary: true,
    city,
    state,
    country,
    skills: faker.helpers.arrayElements(
      ['JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 'Docker'],
      { min: 2, max: 5 },
    ),
    benefits: 'Health Insurance, 401k, Remote Work, Flexible Hours',
  };
}

/**
 * Generate job category
 */
export function generateCategory(parentId?: string): CategoryFixture {
  const name = faker.helpers.arrayElement([
    'Software Development',
    'Data Science',
    'DevOps',
    'Product Management',
    'Design',
    'Marketing',
    'Sales',
    'Customer Support',
  ]);
  return {
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: faker.lorem.sentence(),
    parentId,
  };
}

/**
 * Generate skill
 */
export function generateSkill(): SkillFixture {
  const name = faker.helpers.arrayElement([
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'Go',
    'Rust',
    'React',
    'Vue.js',
    'Angular',
    'Node.js',
    'AWS',
    'Docker',
    'Kubernetes',
    'PostgreSQL',
    'MongoDB',
  ]);
  return {
    name,
    slug: name.toLowerCase().replace(/[.\s]+/g, '-'),
    category: faker.helpers.arrayElement(['Frontend', 'Backend', 'DevOps', 'Database', 'Cloud']),
  };
}

/**
 * Generate multiple jobs
 */
export function generateJobs(count: number): JobFixture[] {
  return Array.from({ length: count }, () => generateJob());
}

/**
 * Generate screening question
 */
export function generateScreeningQuestion() {
  return {
    question: faker.helpers.arrayElement([
      'What is your expected salary?',
      'Are you authorized to work in this country?',
      'Do you have experience with our tech stack?',
      'When can you start?',
      'Are you willing to relocate?',
    ]),
    type: faker.helpers.arrayElement(['text', 'single_choice', 'multiple_choice', 'boolean']),
    isRequired: faker.datatype.boolean(),
    options: faker.helpers.arrayElement([
      undefined,
      ['Yes', 'No'],
      ['Immediately', '2 weeks', '1 month', '2+ months'],
    ]),
  };
}
