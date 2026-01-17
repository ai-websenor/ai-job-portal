import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';
import { teamMembersCollaboration } from './employer';
import { applicationStatusEnum, interviewStatusEnum, interviewTypeEnum, recommendationTypeEnum } from './enums';

// Job Applications
export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  jobSeekerId: uuid('job_seeker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').notNull().default('applied'),
  coverLetter: text('cover_letter'),
  resumeUrl: varchar('resume_url', { length: 500 }),
  resumeSnapshot: jsonb('resume_snapshot'),
  screeningAnswers: jsonb('screening_answers'),
  rating: integer('rating'),
  notes: text('notes'),
  fitScore: integer('fit_score'),
  source: varchar('source', { length: 50 }),
  isOnHold: boolean('is_on_hold').default(false),
  statusHistory: jsonb('status_history').default([]),
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  viewedAt: timestamp('viewed_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_job_applications_job_id').on(table.jobId),
  index('idx_job_applications_job_seeker_id').on(table.jobSeekerId),
  index('idx_job_applications_status').on(table.status),
]);

// Application History
export const applicationHistory = pgTable('application_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  changedBy: uuid('changed_by').notNull(),
  previousStatus: applicationStatusEnum('previous_status'),
  newStatus: applicationStatusEnum('new_status').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Applicant Notes
export const applicantNotes = pgTable('applicant_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Applicant Tags
export const applicantTags = pgTable('applicant_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Interviews
export const interviews = pgTable('interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  interviewerId: uuid('interviewer_id').references(() => teamMembersCollaboration.id),
  interviewType: interviewTypeEnum('interview_type').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull().default(60),
  location: varchar('location', { length: 255 }),
  meetingLink: varchar('meeting_link', { length: 500 }),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata'),
  status: interviewStatusEnum('status').notNull().default('scheduled'),
  calendarEventId: varchar('calendar_event_id', { length: 255 }),
  googleEventId: varchar('google_event_id', { length: 255 }),
  outlookEventId: varchar('outlook_event_id', { length: 255 }),
  icsFileUrl: varchar('ics_file_url', { length: 500 }),
  reminderSent: timestamp('reminder_sent'),
  reminder24hSentAt: timestamp('reminder_24h_sent_at'),
  reminder2hSentAt: timestamp('reminder_2h_sent_at'),
  interviewerNotes: text('interviewer_notes'),
  candidateFeedback: text('candidate_feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Interview Feedback
export const interviewFeedback = pgTable('interview_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  interviewId: uuid('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  submittedBy: uuid('submitted_by').notNull().references(() => users.id),
  overallRating: integer('overall_rating'),
  technicalRating: integer('technical_rating'),
  communicationRating: integer('communication_rating'),
  cultureFitRating: integer('culture_fit_rating'),
  strengths: text('strengths'),
  weaknesses: text('weaknesses'),
  recommendation: recommendationTypeEnum('recommendation'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
