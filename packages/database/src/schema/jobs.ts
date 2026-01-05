import { pgTable, uuid, varchar, text, timestamp, boolean, integer, pgEnum, pgSchema } from 'drizzle-orm/pg-core';
import { employers } from './users';

// Create job schema

// Job type enum
export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'gig', 'remote']);

// Experience level enum
export const experienceLevelEnum = pgEnum('experience_level', ['entry', 'mid', 'senior', 'lead']);

// Jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  workType: varchar('work_type', { length: 50 }),
  experienceLevel: varchar('experience_level', { length: 100 }),
  location: varchar('location', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  payRate: varchar('pay_rate', { length: 50 }),
  showSalary: boolean('show_salary').notNull().default(true),
  skills: text('skills').array(),
  deadline: timestamp('deadline'),
  isActive: boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  isHighlighted: boolean('is_highlighted').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  applicationCount: integer('application_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Screening Questions table
export const screeningQuestions = pgTable('screening_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: varchar('question_type', { length: 20 }).notNull(),
  options: text('options').array(), // For MCQ questions
  isRequired: boolean('is_required').notNull().default(true),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Job Categories table
export const jobCategories = pgTable('job_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job-Category relationship (many-to-many)
export const jobCategoryRelations = pgTable('job_category_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => jobCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Saved Jobs table
export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  jobSeekerId: uuid('job_seeker_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Job Alerts table
export const jobAlerts = pgTable('job_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobSeekerId: uuid('job_seeker_id').notNull(),
  keywords: text('keywords').array(),
  location: varchar('location', { length: 255 }),
  jobType: text('job_type').array(),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  frequency: varchar('frequency', { length: 20 }).notNull().default('instant'), // 'instant', 'daily', 'weekly'
  isActive: boolean('is_active').notNull().default(true),
  lastSent: timestamp('last_sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
