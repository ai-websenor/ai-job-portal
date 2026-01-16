import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { profileVisibilityEnum, skillProficiencyEnum, employmentTypeEnum } from './enums';

// Domain 2: Profiles (10 tables)

export const candidateProfiles = pgTable('candidate_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: text('avatar_url'),
  headline: varchar('headline', { length: 255 }),
  summary: text('summary'),
  locationCity: varchar('location_city', { length: 100 }),
  locationState: varchar('location_state', { length: 100 }),
  locationCountry: varchar('location_country', { length: 100 }),
  visibility: profileVisibilityEnum('visibility').notNull().default('public'),
  isOpenToWork: boolean('is_open_to_work').notNull().default(true),
  expectedSalaryMin: integer('expected_salary_min'),
  expectedSalaryMax: integer('expected_salary_max'),
  salaryCurrency: varchar('salary_currency', { length: 3 }).default('INR'),
  noticePeriodDays: integer('notice_period_days'),
  profileCompleteness: integer('profile_completeness').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_profiles_user_id_idx').on(table.userId),
  index('candidate_profiles_location_idx').on(table.locationCity, table.locationCountry),
]);

export const candidateExperiences = pgTable('candidate_experiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  employmentType: employmentTypeEnum('employment_type'),
  location: varchar('location', { length: 255 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  isCurrent: boolean('is_current').notNull().default(false),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_experiences_profile_id_idx').on(table.candidateProfileId),
]);

export const candidateEducation = pgTable('candidate_education', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  institution: varchar('institution', { length: 255 }).notNull(),
  degree: varchar('degree', { length: 255 }).notNull(),
  fieldOfStudy: varchar('field_of_study', { length: 255 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  grade: varchar('grade', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_education_profile_id_idx').on(table.candidateProfileId),
]);

export const candidateSkills = pgTable('candidate_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull(),
  proficiency: skillProficiencyEnum('proficiency').default('intermediate'),
  yearsOfExperience: numeric('years_of_experience', { precision: 3, scale: 1 }),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_skills_profile_id_idx').on(table.candidateProfileId),
  index('candidate_skills_skill_id_idx').on(table.skillId),
]);

export const candidateResumes = pgTable('candidate_resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  parsedData: text('parsed_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_resumes_profile_id_idx').on(table.candidateProfileId),
]);

export const candidateCertifications = pgTable('candidate_certifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  issuingOrganization: varchar('issuing_organization', { length: 255 }).notNull(),
  issueDate: timestamp('issue_date'),
  expirationDate: timestamp('expiration_date'),
  credentialId: varchar('credential_id', { length: 255 }),
  credentialUrl: text('credential_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_certifications_profile_id_idx').on(table.candidateProfileId),
]);

export const candidateProjects = pgTable('candidate_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  url: text('url'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  technologies: text('technologies'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_projects_profile_id_idx').on(table.candidateProfileId),
]);

export const candidateLanguages = pgTable('candidate_languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  language: varchar('language', { length: 100 }).notNull(),
  proficiency: varchar('proficiency', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_languages_profile_id_idx').on(table.candidateProfileId),
]);

export const candidateSocialLinks = pgTable('candidate_social_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 50 }).notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_social_links_profile_id_idx').on(table.candidateProfileId),
]);

export const candidatePreferences = pgTable('candidate_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }).unique(),
  preferredLocations: text('preferred_locations'),
  preferredIndustries: text('preferred_industries'),
  preferredCompanySizes: text('preferred_company_sizes'),
  preferredWorkModes: text('preferred_work_modes'),
  preferredEmploymentTypes: text('preferred_employment_types'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
