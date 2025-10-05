import { pgTable, uuid, varchar, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { jobs } from './jobs';

// Company size enum
export const companySizeEnum = pgEnum('company_size', ['1-10', '11-50', '51-200', '201-500', '500+']);

// Company type enum
export const companyTypeEnum = pgEnum('company_type', ['startup', 'sme', 'mnc', 'government']);

// Verification status enum
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);

// Companies table (enhanced employer profile)
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  industry: varchar('industry', { length: 100 }),
  companySize: companySizeEnum('company_size'),
  yearEstablished: integer('year_established'),
  companyType: companyTypeEnum('company_type'),
  website: varchar('website', { length: 500 }),
  description: text('description'),
  mission: text('mission'),
  culture: text('culture'),
  benefits: text('benefits'), // JSON stringified
  logoUrl: varchar('logo_url', { length: 500 }),
  bannerUrl: varchar('banner_url', { length: 500 }),
  tagline: varchar('tagline', { length: 255 }),
  isVerified: boolean('is_verified').default(false),
  verificationStatus: verificationStatusEnum('verification_status').default('pending'),
  verificationDocuments: text('verification_documents'), // JSON stringified
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Saved Searches table
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  searchCriteria: text('search_criteria').notNull(), // JSON stringified
  alertEnabled: boolean('alert_enabled').default(true),
  alertFrequency: varchar('alert_frequency', { length: 20 }).default('daily'), // 'instant', 'daily', 'weekly'
  alertChannels: text('alert_channels'), // JSON stringified
  lastAlertSent: timestamp('last_alert_sent'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job Views table
export const jobViews = pgTable('job_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

// Share channel enum
export const shareChannelEnum = pgEnum('share_channel', ['whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link']);

// Job Shares table
export const jobShares = pgTable('job_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  shareChannel: shareChannelEnum('share_channel').notNull(),
  sharedAt: timestamp('shared_at').notNull().defaultNow(),
});

// Applicant Notes table
export const applicantNotes = pgTable('applicant_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Applicant Tags table
export const applicantTags = pgTable('applicant_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull(),
  tag: varchar('tag', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
