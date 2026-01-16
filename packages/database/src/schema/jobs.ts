import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { employers, companies } from './employer';
import { workModeEnum, frequencyEnum, notificationChannelEnum, shareChannelEnum } from './enums';

// Job Categories
export const jobCategories = pgTable('job_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  displayOrder: integer('display_order'),
  isDiscoverable: boolean('is_discoverable').default(true),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('job_categories_slug_unique').on(table.slug),
]);

// Job Categories Admin
export const jobCategoriesAdmin = pgTable('job_categories_admin', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Jobs
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id'),
  categoryId: uuid('category_id').references(() => jobCategories.id, { onDelete: 'set null' }),
  clonedFromId: uuid('cloned_from_id'),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  employmentType: varchar('employment_type', { length: 50 }),
  engagementType: varchar('engagement_type', { length: 50 }),
  workMode: workModeEnum('work_mode'),
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
}, (table) => [
  index('idx_jobs_employer_id').on(table.employerId),
  index('idx_jobs_created_at').on(table.createdAt),
  index('idx_jobs_is_active').on(table.isActive),
  index('idx_jobs_job_type').on(table.jobType),
  index('idx_jobs_experience').on(table.experienceLevel),
  index('idx_jobs_salary_range').on(table.salaryMin, table.salaryMax),
  index('idx_jobs_state_city').on(table.state, table.city),
  index('idx_jobs_urgent').on(table.isUrgent),
]);

// Job Category Relations
export const jobCategoryRelations = pgTable('job_category_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => jobCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Screening Questions
export const screeningQuestions = pgTable('screening_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  questionType: varchar('question_type', { length: 20 }).notNull(),
  options: text('options').array(),
  isRequired: boolean('is_required').default(true),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Saved Jobs
export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobSeekerId: uuid('job_seeker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Saved Searches
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  searchCriteria: text('search_criteria').notNull(),
  alertEnabled: boolean('alert_enabled').default(true),
  alertFrequency: varchar('alert_frequency', { length: 20 }).default('daily'),
  alertChannels: text('alert_channels'),
  lastAlertSent: timestamp('last_alert_sent'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job Alerts
export const jobAlerts = pgTable('job_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobSeekerId: uuid('job_seeker_id').notNull(),
  categoryId: uuid('category_id').references(() => jobCategories.id),
  companyId: uuid('company_id').references(() => companies.id),
  keywords: text('keywords').array(),
  location: varchar('location', { length: 255 }),
  jobType: text('job_type').array(),
  experienceLevel: varchar('experience_level', { length: 50 }),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  frequency: varchar('frequency', { length: 20 }).notNull().default('instant'),
  channels: notificationChannelEnum('channels').array().default(['email']),
  alertCount: integer('alert_count').default(0),
  isActive: boolean('is_active').notNull().default(true),
  lastSent: timestamp('last_sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job Alerts Enhanced
export const jobAlertsEnhanced = pgTable('job_alerts_enhanced', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  searchCriteria: text('search_criteria').notNull(),
  frequency: frequencyEnum('frequency').default('daily'),
  channels: text('channels'),
  isActive: boolean('is_active').default(true),
  lastTriggered: timestamp('last_triggered'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job Views
export const jobViews = pgTable('job_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
});

// Job Shares
export const jobShares = pgTable('job_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  shareChannel: shareChannelEnum('share_channel').notNull(),
  sharedAt: timestamp('shared_at').notNull().defaultNow(),
});

// Job Search History
export const jobSearchHistory = pgTable('job_search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyword: text('keyword'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  jobType: varchar('job_type', { length: 50 }),
  experienceLevel: varchar('experience_level', { length: 100 }),
  searchedAt: timestamp('searched_at').notNull().defaultNow(),
});
