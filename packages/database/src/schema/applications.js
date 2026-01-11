'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.applicationHistory =
  exports.interviews =
  exports.interviewStatusEnum =
  exports.applications =
  exports.applicationStatusEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const jobs_1 = require('./jobs');
const users_1 = require('./users');
exports.applicationStatusEnum = (0, pg_core_1.pgEnum)('application_status', [
  'applied',
  'viewed',
  'shortlisted',
  'interview_scheduled',
  'rejected',
  'hired',
]);
exports.applications = (0, pg_core_1.pgTable)('applications', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => jobs_1.jobs.id, { onDelete: 'cascade' }),
  jobSeekerId: (0, pg_core_1.uuid)('job_seeker_id')
    .notNull()
    .references(() => users_1.jobSeekers.id, { onDelete: 'cascade' }),
  status: (0, exports.applicationStatusEnum)('status').notNull().default('applied'),
  coverLetter: (0, pg_core_1.text)('cover_letter'),
  resumeUrl: (0, pg_core_1.varchar)('resume_url', { length: 500 }),
  screeningAnswers: (0, pg_core_1.json)('screening_answers'),
  rating: (0, pg_core_1.integer)('rating'),
  notes: (0, pg_core_1.text)('notes'),
  appliedAt: (0, pg_core_1.timestamp)('applied_at').notNull().defaultNow(),
  viewedAt: (0, pg_core_1.timestamp)('viewed_at'),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.interviewStatusEnum = (0, pg_core_1.pgEnum)('interview_status', [
  'scheduled',
  'confirmed',
  'completed',
  'rescheduled',
  'canceled',
  'no_show',
]);
exports.interviews = (0, pg_core_1.pgTable)('interviews', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  applicationId: (0, pg_core_1.uuid)('application_id')
    .notNull()
    .references(() => exports.applications.id, { onDelete: 'cascade' }),
  interviewType: (0, pg_core_1.varchar)('interview_type', { length: 50 }).notNull(),
  scheduledAt: (0, pg_core_1.timestamp)('scheduled_at').notNull(),
  duration: (0, pg_core_1.integer)('duration').notNull().default(60),
  location: (0, pg_core_1.varchar)('location', { length: 255 }),
  interviewerNotes: (0, pg_core_1.text)('interviewer_notes'),
  candidateFeedback: (0, pg_core_1.text)('candidate_feedback'),
  status: (0, exports.interviewStatusEnum)('status').notNull().default('scheduled'),
  calendarEventId: (0, pg_core_1.varchar)('calendar_event_id', { length: 255 }),
  reminderSent: (0, pg_core_1.timestamp)('reminder_sent'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.applicationHistory = (0, pg_core_1.pgTable)('application_history', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  applicationId: (0, pg_core_1.uuid)('application_id')
    .notNull()
    .references(() => exports.applications.id, { onDelete: 'cascade' }),
  changedBy: (0, pg_core_1.uuid)('changed_by').notNull(),
  previousStatus: (0, exports.applicationStatusEnum)('previous_status'),
  newStatus: (0, exports.applicationStatusEnum)('new_status').notNull(),
  comment: (0, pg_core_1.text)('comment'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
//# sourceMappingURL=applications.js.map
