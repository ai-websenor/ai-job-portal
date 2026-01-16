import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { candidateProfiles, candidateResumes } from './profiles';
import { users } from './auth';
import { applicationStatusEnum, interviewStatusEnum, interviewTypeEnum, offerStatusEnum } from './enums';

// Domain 5: Applications (5 tables)

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  resumeId: uuid('resume_id').references(() => candidateResumes.id),
  coverLetter: text('cover_letter'),
  status: applicationStatusEnum('status').notNull().default('pending'),
  answers: text('answers'),
  source: text('source'),
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('applications_job_id_idx').on(table.jobId),
  index('applications_candidate_id_idx').on(table.candidateProfileId),
  index('applications_status_idx').on(table.status),
]);

export const applicationStatusHistory = pgTable('application_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  fromStatus: applicationStatusEnum('from_status'),
  toStatus: applicationStatusEnum('to_status').notNull(),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('application_status_history_app_id_idx').on(table.applicationId),
]);

export const interviews = pgTable('interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  type: interviewTypeEnum('type').notNull(),
  status: interviewStatusEnum('status').notNull().default('scheduled'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull().default(60),
  location: text('location'),
  meetingLink: text('meeting_link'),
  interviewerIds: text('interviewer_ids'),
  interviewerNotes: text('interviewer_notes'),
  candidateFeedback: text('candidate_feedback'),
  rating: integer('rating'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('interviews_application_id_idx').on(table.applicationId),
  index('interviews_scheduled_at_idx').on(table.scheduledAt),
  index('interviews_status_idx').on(table.status),
]);

export const applicationNotes = pgTable('application_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  isPrivate: boolean('is_private').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('application_notes_app_id_idx').on(table.applicationId),
]);

export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  salary: integer('salary').notNull(),
  currency: text('currency').notNull().default('INR'),
  joiningDate: timestamp('joining_date').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  additionalBenefits: text('additional_benefits'),
  offerLetterUrl: text('offer_letter_url'),
  status: offerStatusEnum('status').notNull().default('pending'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('offers_application_id_idx').on(table.applicationId),
  index('offers_status_idx').on(table.status),
]);
