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
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';
import { teamMembersCollaboration } from './employer';
import {
  applicationStatusEnum,
  interviewStatusEnum,
  interviewTypeEnum,
  recommendationTypeEnum,
} from './enums';

/**
 * Job applications submitted by candidates
 * @example
 * {
 *   id: "app-1234-5678-90ab-cdef11112222",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   jobSeekerId: "550e8400-e29b-41d4-a716-446655440000",
 *   status: "interview",
 *   coverLetter: "Dear Hiring Manager, I am excited to apply...",
 *   resumeUrl: "https://cdn.jobportal.in/resumes/priya-sharma-2025.pdf",
 *   screeningAnswers: {"q1": "5+ years", "q2": "Yes"},
 *   rating: 4,
 *   fitScore: 85,
 *   source: "job_board",
 *   appliedAt: "2025-01-10T09:30:00Z",
 *   viewedAt: "2025-01-11T14:00:00Z"
 * }
 */
export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    jobSeekerId: uuid('job_seeker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: applicationStatusEnum('status').notNull().default('applied'),
    coverLetter: text('cover_letter'),
    resumeUrl: varchar('resume_url', { length: 500 }),
    resumeSnapshot: jsonb('resume_snapshot'),
    screeningAnswers: jsonb('screening_answers'),
    rating: integer('rating'),
    notes: text('notes'),
    fitScore: integer('fit_score'),
    source: varchar('source', { length: 50 }),
    agreeConsent: boolean('agree_consent').notNull().default(false),
    isOnHold: boolean('is_on_hold').default(false),
    statusHistory: jsonb('status_history').default([]),
    appliedAt: timestamp('applied_at').notNull().defaultNow(),
    viewedAt: timestamp('viewed_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_job_applications_job_id').on(table.jobId),
    index('idx_job_applications_job_seeker_id').on(table.jobSeekerId),
    index('idx_job_applications_status').on(table.status),
  ],
);

/**
 * Audit log for application status changes
 * @example
 * {
 *   id: "hist-1234-5678-90ab-cdef22223333",
 *   applicationId: "app-1234-5678-90ab-cdef11112222",
 *   changedBy: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   previousStatus: "applied",
 *   newStatus: "shortlisted",
 *   comment: "Strong technical skills, moving to shortlist"
 * }
 */
export const applicationHistory = pgTable('application_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => jobApplications.id, { onDelete: 'cascade' }),
  changedBy: uuid('changed_by').notNull(),
  previousStatus: applicationStatusEnum('previous_status'),
  newStatus: applicationStatusEnum('new_status').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Recruiter notes on job applications
 * @example
 * {
 *   id: "note-1234-5678-90ab-cdef33334444",
 *   applicationId: "app-1234-5678-90ab-cdef11112222",
 *   authorId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   note: "Candidate has excellent communication skills. Schedule technical round with Rahul."
 * }
 */
export const applicantNotes = pgTable('applicant_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => jobApplications.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tags for categorizing applicants in ATS pipeline
 * @example
 * {
 *   id: "tag-1234-5678-90ab-cdef44445555",
 *   applicationId: "app-1234-5678-90ab-cdef11112222",
 *   tag: "strong_candidate",
 *   color: "#22c55e",
 *   createdBy: "emp-aaaa-bbbb-cccc-dddd11112222"
 * }
 */
export const applicantTags = pgTable('applicant_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => jobApplications.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Interview scheduling and tracking
 * @example
 * {
 *   id: "int-1234-5678-90ab-cdef55556666",
 *   applicationId: "app-1234-5678-90ab-cdef11112222",
 *   interviewerId: "team-1234-5678-90ab-cdef33334444",
 *   interviewType: "technical",
 *   scheduledAt: "2025-01-20T10:00:00Z",
 *   duration: 60,
 *   meetingLink: "https://meet.google.com/abc-defg-hij",
 *   timezone: "Asia/Kolkata",
 *   status: "scheduled",
 *   googleEventId: "abc123xyz789",
 *   reminder24hSentAt: "2025-01-19T10:00:00Z"
 * }
 */
export const interviews = pgTable('interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => jobApplications.id, { onDelete: 'cascade' }),
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

/**
 * Interview feedback and ratings from interviewers
 * @example
 * {
 *   id: "fb-1234-5678-90ab-cdef66667777",
 *   interviewId: "int-1234-5678-90ab-cdef55556666",
 *   submittedBy: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   overallRating: 4,
 *   technicalRating: 5,
 *   communicationRating: 4,
 *   cultureFitRating: 4,
 *   strengths: "Strong problem-solving, excellent React knowledge",
 *   weaknesses: "Could improve system design skills",
 *   recommendation: "hire",
 *   notes: "Recommend for senior position"
 * }
 */
export const interviewFeedback = pgTable('interview_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  interviewId: uuid('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),
  submittedBy: uuid('submitted_by')
    .notNull()
    .references(() => users.id),
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
