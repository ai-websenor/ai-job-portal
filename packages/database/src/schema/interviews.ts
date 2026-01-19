import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { jobApplications } from './job-applications';
import { jobs } from './jobs';
import { users, employers } from './users';

export const interviewStatusEnum = pgEnum('interview_status', [
  'scheduled',
  'rescheduled',
  'cancelled',
  'completed',
  'no_show',
]);

export const interviews = pgTable('interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => jobApplications.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  // Actually, let's try to reference if strictly needed, but for now I will follow the user spec "job_id UUID" and since I am in a separate file, I can import jobs.
  // However, user said "job_applications.job_id (READ ONLY)" and prompt table def just said "job_id UUID".
  interviewType: varchar('interview_type').$defaultFn(() => 'general'), // Legacy required column, defaults to 'general' for new flow
  // Let's stick to the simplest implementation requested: "job_id UUID"

  employerId: uuid('employer_id')
    .notNull()
    .references(() => employers.id, { onDelete: 'cascade' }),
  candidateId: uuid('candidate_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  duration: integer('duration'), // @deprecated - use duration_minutes
  meetingType: varchar('meeting_type'), // 'online' | 'offline'
  meetingTool: varchar('meeting_tool'), // 'Zoom', 'Teams'
  meetingLink: text('meeting_link'),
  location: text('location'),

  interviewerNotes: text('interviewer_notes'),
  candidateFeedback: text('candidate_feedback'),
  calendarEventId: text('calendar_event_id'),
  reminderSent: boolean('reminder_sent'),
  timezone: varchar('timezone'),
  reminder24hSentAt: timestamp('reminder_24h_sent_at', { withTimezone: true }),
  reminder2hSentAt: timestamp('reminder_2h_sent_at', { withTimezone: true }),
  interviewerId: uuid('interviewer_id'),
  icsFileUrl: text('ics_file_url'),
  googleEventId: text('google_event_id'),
  outlookEventId: text('outlook_event_id'),
  notes: text('notes'),

  status: interviewStatusEnum('status').notNull().default('scheduled'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
