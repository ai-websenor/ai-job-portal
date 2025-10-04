import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum, json } from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { jobSeekers } from './users';

// Application status enum
export const applicationStatusEnum = pgEnum('application_status', [
  'applied',
  'viewed',
  'shortlisted',
  'interview_scheduled',
  'rejected',
  'hired',
]);

// Applications table
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  jobSeekerId: uuid('job_seeker_id').notNull().references(() => jobSeekers.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').notNull().default('applied'),
  coverLetter: text('cover_letter'),
  resumeUrl: varchar('resume_url', { length: 500 }),
  screeningAnswers: json('screening_answers'), // JSON object with question-answer pairs
  rating: integer('rating'), // 1-5 rating by employer
  notes: text('notes'), // Employer's notes
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  viewedAt: timestamp('viewed_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Interview status enum
export const interviewStatusEnum = pgEnum('interview_status', [
  'scheduled',
  'confirmed',
  'completed',
  'rescheduled',
  'canceled',
  'no_show',
]);

// Interviews table
export const interviews = pgTable('interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  interviewType: varchar('interview_type', { length: 50 }).notNull(), // 'phone', 'video', 'in_person'
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull().default(60), // in minutes
  location: varchar('location', { length: 255 }), // For in-person or video link
  interviewerNotes: text('interviewer_notes'),
  candidateFeedback: text('candidate_feedback'),
  status: interviewStatusEnum('status').notNull().default('scheduled'),
  calendarEventId: varchar('calendar_event_id', { length: 255 }), // Google/Outlook calendar ID
  reminderSent: timestamp('reminder_sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Application History/Audit Log
export const applicationHistory = pgTable('application_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  changedBy: uuid('changed_by').notNull(), // User ID who made the change
  previousStatus: applicationStatusEnum('previous_status'),
  newStatus: applicationStatusEnum('new_status').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
