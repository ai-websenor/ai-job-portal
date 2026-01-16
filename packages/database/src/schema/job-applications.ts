import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { users } from './users';

// Application status enum
export const applicationStatusEnum = pgEnum('application_status', [
  'applied',
  'viewed',
  'shortlisted',
  'interview_scheduled',
  'rejected',
  'hired',
  'withdrawn',
  'offer_accepted',
  'offer_rejected',
]);

// Job Applications table
export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),

    jobSeekerId: uuid('job_seeker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // candidate lives in users

    status: applicationStatusEnum('status').notNull().default('applied'),

    coverLetter: text('cover_letter'),

    resumeUrl: varchar('resume_url', { length: 500 }),

    resumeSnapshot: jsonb('resume_snapshot'), // snapshot at time of apply ✅

    screeningAnswers: jsonb('screening_answers'),

    rating: integer('rating'),

    notes: text('notes'),

    statusHistory: jsonb('status_history').notNull().default('[]'),

    appliedAt: timestamp('applied_at').notNull().defaultNow(),

    viewedAt: timestamp('viewed_at'),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uqJobSeekerApplication: uniqueIndex('uq_job_seeker_application').on(
      table.jobId,
      table.jobSeekerId,
    ),
  }),
);

// Application History/Audit Log
export const applicationHistory = pgTable('application_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => jobApplications.id, { onDelete: 'cascade' }),
  changedBy: uuid('changed_by').notNull(), // User ID who made the change
  previousStatus: applicationStatusEnum('previous_status'),
  newStatus: applicationStatusEnum('new_status').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
