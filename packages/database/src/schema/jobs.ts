import { pgTable, uuid, varchar, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { employerProfiles } from './employer';
import { users } from './auth';
import { jobStatusEnum, employmentTypeEnum, workModeEnum, experienceLevelEnum } from './enums';

// Domain 4: Jobs (11 tables)

export const jobCategories = pgTable('job_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id'),
  iconUrl: text('icon_url'),
  jobCount: integer('job_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_categories_slug_idx').on(table.slug),
  index('job_categories_parent_id_idx').on(table.parentId),
]);

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  categoryId: uuid('category_id').references(() => jobCategories.id),
  isVerifiable: boolean('is_verifiable').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('skills_slug_idx').on(table.slug),
  index('skills_category_id_idx').on(table.categoryId),
]);

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerProfileId: uuid('employer_profile_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => jobCategories.id),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  responsibilities: text('responsibilities'),
  benefits: text('benefits'),
  employmentType: employmentTypeEnum('employment_type').notNull(),
  workMode: workModeEnum('work_mode').notNull(),
  experienceLevel: experienceLevelEnum('experience_level').notNull(),
  experienceMin: integer('experience_min'),
  experienceMax: integer('experience_max'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: varchar('salary_currency', { length: 3 }).default('INR'),
  showSalary: boolean('show_salary').notNull().default(true),
  locationCity: varchar('location_city', { length: 100 }),
  locationState: varchar('location_state', { length: 100 }),
  locationCountry: varchar('location_country', { length: 100 }),
  status: jobStatusEnum('status').notNull().default('draft'),
  viewCount: integer('view_count').notNull().default(0),
  applicationCount: integer('application_count').notNull().default(0),
  isFeatured: boolean('is_featured').notNull().default(false),
  isUrgent: boolean('is_urgent').notNull().default(false),
  publishedAt: timestamp('published_at'),
  expiresAt: timestamp('expires_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('jobs_employer_id_idx').on(table.employerProfileId),
  index('jobs_category_id_idx').on(table.categoryId),
  index('jobs_status_idx').on(table.status),
  index('jobs_location_idx').on(table.locationCity, table.locationCountry),
  index('jobs_employment_type_idx').on(table.employmentType),
  index('jobs_work_mode_idx').on(table.workMode),
  index('jobs_experience_level_idx').on(table.experienceLevel),
]);

export const jobSkills = pgTable('job_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_skills_job_id_idx').on(table.jobId),
  index('job_skills_skill_id_idx').on(table.skillId),
]);

export const jobQuestions = pgTable('job_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: varchar('question_type', { length: 50 }).notNull().default('text'),
  isRequired: boolean('is_required').notNull().default(false),
  options: text('options'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_questions_job_id_idx').on(table.jobId),
]);

export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('saved_jobs_user_id_idx').on(table.userId),
  index('saved_jobs_job_id_idx').on(table.jobId),
]);

export const jobViews = pgTable('job_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_views_job_id_idx').on(table.jobId),
  index('job_views_user_id_idx').on(table.userId),
]);

export const jobAlerts = pgTable('job_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }),
  keywords: text('keywords'),
  categoryId: uuid('category_id').references(() => jobCategories.id),
  location: varchar('location', { length: 255 }),
  employmentTypes: text('employment_types'),
  workModes: text('work_modes'),
  salaryMin: integer('salary_min'),
  frequency: varchar('frequency', { length: 20 }).notNull().default('daily'),
  isActive: boolean('is_active').notNull().default(true),
  lastSentAt: timestamp('last_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('job_alerts_user_id_idx').on(table.userId),
]);

export const jobBenefits = pgTable('job_benefits', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  iconUrl: text('icon_url'),
  category: varchar('category', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const jobBenefitMappings = pgTable('job_benefit_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  benefitId: uuid('benefit_id').notNull().references(() => jobBenefits.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_benefit_mappings_job_id_idx').on(table.jobId),
]);

export const companyFollowers = pgTable('company_followers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  employerProfileId: uuid('employer_profile_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('company_followers_user_id_idx').on(table.userId),
  index('company_followers_employer_id_idx').on(table.employerProfileId),
]);
