import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { employers, users } from './users';
import { companies } from './companies';

// Create job schema

// Job type enum
export const jobTypeEnum = pgEnum('job_type', [
  'full_time',
  'part_time',
  'contract',
  'gig',
  'remote',
]);

// Experience level enum
export const experienceLevelEnum = pgEnum('experience_level', ['entry', 'mid', 'senior', 'lead']);

// Job Categories table (Moved before jobs)
export const jobCategories = pgTable(
  'job_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    icon: varchar('icon', { length: 100 }),
    isActive: boolean('is_active').notNull().default(true),

    // New discovery columns
    displayOrder: integer('display_order'),
    isDiscoverable: boolean('is_discoverable').default(true),
    parentId: uuid('parent_id'),
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    parentIdFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'job_categories_parent_id_fk',
    }).onDelete('set null'),
  }),
);

// Jobs table
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    employerId: uuid('employer_id')
      .notNull()
      .references(() => employers.id, { onDelete: 'cascade' }),

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

    // New discovery columns
    categoryId: uuid('category_id').references(() => jobCategories.id, { onDelete: 'set null' }),

    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),

    trendingScore: integer('trending_score'),

    popularityScore: integer('popularity_score'),

    relevanceScore: integer('relevance_score'),

    lastActivityAt: timestamp('last_activity_at'),

    deadline: timestamp('deadline'),

    isActive: boolean('is_active').notNull().default(true),

    isFeatured: boolean('is_featured').notNull().default(false),

    isHighlighted: boolean('is_highlighted').notNull().default(false),

    viewCount: integer('view_count').notNull().default(0),

    applicationCount: integer('application_count').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    // ================= NEW ENHANCED FIELDS (BACKWARD COMPATIBLE) =================
    // All fields are nullable to maintain backward compatibility with existing data

    // Experience range (replaces categorical experienceLevel long-term)
    experienceMin: integer('experience_min'), // NULL - minimum years of experience
    experienceMax: integer('experience_max'), // NULL - maximum years of experience

    // Employment type (clarifies jobType - full_time vs part_time)
    employmentType: varchar('employment_type', { length: 50 }), // NULL

    // Engagement type (new dimension - permanent vs contract vs gig)
    engagementType: varchar('engagement_type', { length: 50 }), // NULL

    // Work mode (clarifies workType - on_site vs remote vs hybrid)
    workMode: varchar('work_mode', { length: 50 }), // NULL

    // Screening questions (JSONB - consolidates screeningQuestions table)
    questions: jsonb('questions'), // NULL - array of question objects

    // Additional fields
    country: varchar('country', { length: 100 }),
    section: jsonb('section'),
    immigrationStatus: varchar('immigration_status', { length: 100 }),
    qualification: text('qualification'),
    certification: text('certification'),
    travelRequirements: text('travel_requirements'),
  },
  (table) => ({
    idxJobsStateCity: index('idx_jobs_state_city').on(table.state, table.city),

    idxJobsType: index('idx_jobs_job_type').on(table.jobType),

    idxJobsExperience: index('idx_jobs_experience').on(table.experienceLevel),

    idxJobsActive: index('idx_jobs_is_active').on(table.isActive),

    // Partial unique index: prevent duplicate active jobs for same employer
    uqActiveJobEmployer: uniqueIndex('uq_active_job_employer')
      .on(
        table.employerId,
        table.title,
        table.jobType,
        table.experienceLevel,
        table.city,
        table.state,
        table.workType,
      )
      .where(sql`${table.isActive} = true`),
  }),
);

// Screening Questions table
export const screeningQuestions = pgTable('screening_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: varchar('question_type', { length: 20 }).notNull(),
  options: text('options').array(), // For MCQ questions
  isRequired: boolean('is_required').notNull().default(true),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Job-Category relationship (many-to-many)
export const jobCategoryRelations = pgTable('job_category_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => jobCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Saved Jobs table
export const savedJobs = pgTable(
  'saved_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),

    jobSeekerId: uuid('job_seeker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // candidate in users

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uqSavedJob: uniqueIndex('uq_saved_job').on(table.jobId, table.jobSeekerId),
  }),
);

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
// Job Views table
export const jobViews = pgTable(
  'job_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // candidate

    viewedAt: timestamp('viewed_at').notNull().defaultNow(),

    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 / IPv6

    userAgent: text('user_agent'),
  },
  (table) => ({
    idxJobViewsUserTime: index('idx_job_views_user_time').on(table.userId, table.viewedAt),

    idxJobViewsJob: index('idx_job_views_job').on(table.jobId),
  }),
);

// Job Search History table
export const jobSearchHistory = pgTable(
  'job_search_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    keyword: text('keyword'),

    city: varchar('city', { length: 100 }),

    state: varchar('state', { length: 100 }),

    jobType: varchar('job_type', { length: 50 }),

    experienceLevel: varchar('experience_level', { length: 100 }),

    searchedAt: timestamp('searched_at').notNull().defaultNow(),
  },
  (table) => ({
    idxJobSearchHistoryUserTime: index('idx_job_search_history_user_time').on(
      table.userId,
      table.searchedAt,
    ),
  }),
);

// Job Recommendations table
export const jobRecommendations = pgTable(
  'job_recommendations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),

    score: integer('score').notNull(), // 0–100 relevance score

    reason: text('reason'), // optional explanation

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    idxJobRecommendationsUserScore: index('idx_job_recommendations_user_score').on(
      table.userId,
      table.score,
    ),
  }),
);
