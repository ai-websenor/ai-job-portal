import { pgTable, uuid, varchar, text, timestamp, integer, date, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';
import { employerProfiles } from './employer';

// Domain 9: Analytics (6 tables)

export const jobAnalytics = pgTable('job_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  views: integer('views').notNull().default(0),
  uniqueViews: integer('unique_views').notNull().default(0),
  applications: integer('applications').notNull().default(0),
  saves: integer('saves').notNull().default(0),
  shares: integer('shares').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_analytics_job_id_idx').on(table.jobId),
  index('job_analytics_date_idx').on(table.date),
]);

export const employerAnalytics = pgTable('employer_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerProfileId: uuid('employer_profile_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  totalJobs: integer('total_jobs').notNull().default(0),
  activeJobs: integer('active_jobs').notNull().default(0),
  totalViews: integer('total_views').notNull().default(0),
  totalApplications: integer('total_applications').notNull().default(0),
  profileViews: integer('profile_views').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('employer_analytics_employer_id_idx').on(table.employerProfileId),
  index('employer_analytics_date_idx').on(table.date),
]);

export const searchAnalytics = pgTable('search_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  query: text('query'),
  filters: text('filters'),
  resultsCount: integer('results_count').notNull().default(0),
  clickedJobId: uuid('clicked_job_id').references(() => jobs.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('search_analytics_user_id_idx').on(table.userId),
  index('search_analytics_created_at_idx').on(table.createdAt),
]);

export const platformMetrics = pgTable('platform_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull().unique(),
  totalUsers: integer('total_users').notNull().default(0),
  newUsers: integer('new_users').notNull().default(0),
  activeUsers: integer('active_users').notNull().default(0),
  totalJobs: integer('total_jobs').notNull().default(0),
  newJobs: integer('new_jobs').notNull().default(0),
  totalApplications: integer('total_applications').notNull().default(0),
  newApplications: integer('new_applications').notNull().default(0),
  totalHires: integer('total_hires').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('platform_metrics_date_idx').on(table.date),
]);

export const userActivityLogs = pgTable('user_activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: uuid('entity_id'),
  metadata: text('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('user_activity_logs_user_id_idx').on(table.userId),
  index('user_activity_logs_action_idx').on(table.action),
  index('user_activity_logs_created_at_idx').on(table.createdAt),
]);

export const conversionFunnels = pgTable('conversion_funnels', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  applies: integer('applies').notNull().default(0),
  interviews: integer('interviews').notNull().default(0),
  offers: integer('offers').notNull().default(0),
  hires: integer('hires').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('conversion_funnels_job_id_idx').on(table.jobId),
  index('conversion_funnels_date_idx').on(table.date),
]);
