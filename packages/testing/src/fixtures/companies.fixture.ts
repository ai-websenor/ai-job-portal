import { faker } from '@faker-js/faker';

export interface CompanyFixture {
  name: string;
  description: string;
  website?: string;
  industry: string;
  size: string;
  founded?: number;
  headquarters: string;
  logo?: string;
}

export interface TeamMemberFixture {
  name: string;
  title: string;
  email: string;
  role: 'owner' | 'admin' | 'recruiter' | 'hiring_manager';
}

/**
 * Generate company
 */
export function generateCompany(): CompanyFixture {
  return {
    name: faker.company.name(),
    description: faker.company.catchPhrase() + '. ' + faker.lorem.paragraph(),
    website: faker.internet.url(),
    industry: faker.helpers.arrayElement([
      'Technology',
      'Healthcare',
      'Finance',
      'Education',
      'Manufacturing',
      'Retail',
      'Consulting',
    ]),
    size: faker.helpers.arrayElement([
      '1-10',
      '11-50',
      '51-200',
      '201-500',
      '501-1000',
      '1001-5000',
      '5000+',
    ]),
    founded: faker.number.int({ min: 1990, max: 2023 }),
    headquarters: `${faker.location.city()}, ${faker.location.country()}`,
  };
}

/**
 * Generate team member
 */
export function generateTeamMember(
  role: TeamMemberFixture['role'] = 'recruiter',
): TeamMemberFixture {
  return {
    name: faker.person.fullName(),
    title: faker.person.jobTitle(),
    email: `test_team_${faker.string.alphanumeric(8)}@test.com`,
    role,
  };
}

/**
 * Generate multiple companies
 */
export function generateCompanies(count: number): CompanyFixture[] {
  return Array.from({ length: count }, () => generateCompany());
}

/**
 * Generate team with different roles
 */
export function generateTeam(): TeamMemberFixture[] {
  return [
    generateTeamMember('owner'),
    generateTeamMember('admin'),
    generateTeamMember('recruiter'),
    generateTeamMember('hiring_manager'),
  ];
}
