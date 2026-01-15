import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { companies } from './companies';

// User role enum
export const userRoleEnum = pgEnum('user_role', ['candidate', 'employer', 'admin', 'team_member']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  mobile: varchar('mobile', { length: 20 }).notNull(),
  role: userRoleEnum('role').notNull().default('candidate'),
  isVerified: boolean('is_verified').notNull().default(false),
  isMobileVerified: boolean('is_mobile_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  resumeDetails: jsonb('resume_details'),
  onboardingStep: integer('onboarding_step').default(0),
  isOnboardingCompleted: boolean('is_onboarding_completed').default(false),
});

// Job Seekers profile table
export const jobSeekers = pgTable('job_seekers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  location: varchar('location', { length: 255 }),
  bio: text('bio'),
  resumeUrl: varchar('resume_url', { length: 500 }),
  videoResumeUrl: varchar('video_resume_url', { length: 500 }),
  skills: text('skills').array(), // Array of skills
  profileCompleteness: varchar('profile_completeness', { length: 10 }).default('0'),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Work Experience table
export const workExperience = pgTable('work_experience', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobSeekerId: uuid('job_seeker_id')
    .notNull()
    .references(() => jobSeekers.id, { onDelete: 'cascade' }),
  company: varchar('company', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  isCurrent: boolean('is_current').notNull().default(false),
  description: text('description'),
  location: varchar('location', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Education table
export const education = pgTable('education', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobSeekerId: uuid('job_seeker_id')
    .notNull()
    .references(() => jobSeekers.id, { onDelete: 'cascade' }),
  institution: varchar('institution', { length: 255 }).notNull(),
  degree: varchar('degree', { length: 255 }).notNull(),
  field: varchar('field', { length: 255 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Subscription plan enum
export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'free',
  'basic',
  'premium',
  'enterprise',
]);

// Employers/Companies table
export const employers = pgTable('employers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  companyLogo: varchar('company_logo', { length: 500 }),
  website: varchar('website', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  description: text('description'),
  isVerified: boolean('is_verified').notNull().default(false),
  subscriptionPlan: subscriptionPlanEnum('subscription_plan').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Team Members table
export const teamMembers = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerId: uuid('employer_id')
    .notNull()
    .references(() => employers.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // e.g., 'hr_manager', 'recruiter', 'admin'
  permissions: text('permissions').array(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
