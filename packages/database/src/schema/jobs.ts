import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { employers } from './employer';
import { shareChannelEnum } from './enums';

/**
 * Hierarchical job categories for classification
 * @example
 * {
 *   id: "cat-1234-5678-90ab-cdef11112222",
 *   parentId: null,
 *   name: "Software Development",
 *   slug: "software-development",
 *   description: "Build and maintain software applications",
 *   icon: "code",
 *   displayOrder: 1,
 *   isDiscoverable: true,
 *   isActive: true
 * }
 */
export const jobCategories = pgTable(
  'job_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 100 }),
    imageUrl: varchar('image_url', { length: 500 }),
    displayOrder: integer('display_order'),
    isDiscoverable: boolean('is_discoverable').default(true),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('job_categories_slug_unique').on(table.slug)],
);

/**
 * Job postings with requirements and metadata
 * @example
 * {
 *   id: "job-aaaa-bbbb-cccc-dddd11112222",
 *   employerId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   categoryId: "cat-1234-5678-90ab-cdef11112222",
 *   title: "Senior React Developer",
 *   description: "We are looking for an experienced React developer...",
 *   jobType: "full_time",
 *   workMode: "hybrid",
 *   experienceMin: 4,
 *   experienceMax: 8,
 *   location: "Bangalore, Karnataka",
 *   city: "Bangalore",
 *   state: "Karnataka",
 *   country: "India",
 *   salaryMin: 1800000,
 *   salaryMax: 3000000,
 *   showSalary: true,
 *   skills: ["React", "TypeScript", "Node.js", "AWS"],
 *   deadline: "2025-02-28T23:59:59Z",
 *   isActive: true,
 *   isFeatured: true,
 *   viewCount: 1250,
 *   applicationCount: 89
 * }
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employerId: uuid('employer_id')
      .notNull()
      .references(() => employers.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id'),
    categoryId: uuid('category_id').references(() => jobCategories.id, { onDelete: 'set null' }),
    clonedFromId: uuid('cloned_from_id'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    jobType: varchar('job_type', { length: 50 }).notNull(),
    employmentType: varchar('employment_type', { length: 50 }),
    engagementType: varchar('engagement_type', { length: 50 }),
    workMode: text('work_mode').array(),
    experienceLevel: varchar('experience_level', { length: 100 }),
    experienceMin: integer('experience_min'),
    experienceMax: integer('experience_max'),
    location: varchar('location', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    showSalary: boolean('show_salary').notNull().default(true),
    payRate: varchar('pay_rate', { length: 50 }),
    skills: text('skills').array(),
    qualification: text('qualification'),
    certification: text('certification'),
    benefits: text('benefits'),
    travelRequirements: text('travel_requirements'),
    immigrationStatus: varchar('immigration_status', { length: 100 }),
    deadline: timestamp('deadline'),
    applicationEmail: varchar('application_email', { length: 255 }),
    bannerImage: varchar('banner_image', { length: 500 }),
    questions: jsonb('questions'),
    section: jsonb('section'),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    isHighlighted: boolean('is_highlighted').notNull().default(false),
    isUrgent: boolean('is_urgent').default(false),
    isCloned: boolean('is_cloned').default(false),
    renewalCount: integer('renewal_count').default(0),
    lastRenewedAt: timestamp('last_renewed_at'),
    duplicateHash: varchar('duplicate_hash', { length: 64 }),
    viewCount: integer('view_count').notNull().default(0),
    applicationCount: integer('application_count').notNull().default(0),
    trendingScore: integer('trending_score'),
    popularityScore: integer('popularity_score'),
    relevanceScore: integer('relevance_score'),
    lastActivityAt: timestamp('last_activity_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_jobs_employer_id').on(table.employerId),
    index('idx_jobs_created_at').on(table.createdAt),
    index('idx_jobs_is_active').on(table.isActive),
    index('idx_jobs_job_type').on(table.jobType),
    index('idx_jobs_experience').on(table.experienceLevel),
    index('idx_jobs_salary_range').on(table.salaryMin, table.salaryMax),
    index('idx_jobs_state_city').on(table.state, table.city),
    index('idx_jobs_urgent').on(table.isUrgent),
  ],
);

/**
 * Many-to-many mapping between jobs and categories
 * @example
 * {
 *   id: "jcr-1234-5678-90ab-cdef22223333",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   categoryId: "cat-1234-5678-90ab-cdef11112222"
 * }
 */
export const jobCategoryRelations = pgTable('job_category_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => jobCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Custom screening questions for job applications
 * @example
 * {
 *   id: "sq-1234-5678-90ab-cdef33334444",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   question: "How many years of React experience do you have?",
 *   questionType: "single_choice",
 *   options: ["1-2 years", "3-4 years", "5+ years"],
 *   isRequired: true,
 *   order: 1
 * }
 */
export const screeningQuestions = pgTable('screening_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: varchar('question_type', { length: 20 }).notNull(),
  options: text('options').array(),
  isRequired: boolean('is_required').default(true),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Jobs bookmarked by candidates for later review
 * @example
 * {
 *   id: "saved-1234-5678-90ab-cdef44445555",
 *   jobSeekerId: "550e8400-e29b-41d4-a716-446655440000",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222"
 * }
 */
export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobSeekerId: uuid('job_seeker_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Saved job search queries with alert notifications
 * @example
 * {
 *   id: "search-1234-5678-90ab-cdef55556666",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "React Jobs in Bangalore",
 *   searchCriteria: "{\"keywords\":\"React\",\"location\":\"Bangalore\",\"salary_min\":1500000}",
 *   alertEnabled: true,
 *   alertFrequency: "daily",
 *   alertChannels: "email,push",
 *   alertCount: 15,
 *   lastAlertSent: "2025-01-15T06:00:00Z",
 *   isActive: true
 * }
 */
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  searchCriteria: text('search_criteria').notNull(),
  alertEnabled: boolean('alert_enabled').default(true),
  alertFrequency: varchar('alert_frequency', { length: 20 }).default('daily'),
  alertChannels: text('alert_channels'),
  alertCount: integer('alert_count').default(0),
  lastAlertSent: timestamp('last_alert_sent'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tracks job posting views for analytics
 * @example
 * {
 *   id: "jv-1234-5678-90ab-cdef66667777",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   ipAddress: "103.15.67.89",
 *   userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
 *   viewedAt: "2025-01-15T14:30:00Z"
 * }
 */
export const jobViews = pgTable('job_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
});

/**
 * Tracks social sharing of job postings
 * @example
 * {
 *   id: "share-1234-5678-90ab-cdef77778888",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   shareChannel: "linkedin",
 *   sharedAt: "2025-01-15T16:45:00Z"
 * }
 */
export const jobShares = pgTable('job_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  shareChannel: shareChannelEnum('share_channel').notNull(),
  sharedAt: timestamp('shared_at').notNull().defaultNow(),
});

/**
 * Tracks user job search queries for recommendations
 * @example
 * {
 *   id: "hist-1234-5678-90ab-cdef88889999",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   keyword: "Senior React Developer",
 *   city: "Mumbai",
 *   state: "Maharashtra",
 *   jobType: "full_time",
 *   experienceLevel: "senior",
 *   searchedAt: "2025-01-15T18:00:00Z"
 * }
 */
export const jobSearchHistory = pgTable('job_search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  keyword: text('keyword'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  jobType: varchar('job_type', { length: 50 }),
  experienceLevel: varchar('experience_level', { length: 100 }),
  searchedAt: timestamp('searched_at').notNull().defaultNow(),
});
