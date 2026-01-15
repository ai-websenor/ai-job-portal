'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.jobAlerts =
  exports.savedJobs =
  exports.jobCategoryRelations =
  exports.jobCategories =
  exports.screeningQuestions =
  exports.jobs =
  exports.experienceLevelEnum =
  exports.jobTypeEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.jobTypeEnum = (0, pg_core_1.pgEnum)('job_type', [
  'full_time',
  'part_time',
  'contract',
  'gig',
  'remote',
]);
exports.experienceLevelEnum = (0, pg_core_1.pgEnum)('experience_level', [
  'entry',
  'mid',
  'senior',
  'lead',
]);
exports.jobs = (0, pg_core_1.pgTable)('jobs', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  employerId: (0, pg_core_1.uuid)('employer_id')
    .notNull()
    .references(() => users_1.employers.id, { onDelete: 'cascade' }),
  title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
  description: (0, pg_core_1.text)('description').notNull(),
  jobType: (0, exports.jobTypeEnum)('job_type').notNull(),
  experienceLevel: (0, exports.experienceLevelEnum)('experience_level').notNull(),
  location: (0, pg_core_1.varchar)('location', { length: 255 }).notNull(),
  salaryMin: (0, pg_core_1.integer)('salary_min'),
  salaryMax: (0, pg_core_1.integer)('salary_max'),
  showSalary: (0, pg_core_1.boolean)('show_salary').notNull().default(true),
  skills: (0, pg_core_1.text)('skills').array(),
  deadline: (0, pg_core_1.timestamp)('deadline'),
  isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
  isFeatured: (0, pg_core_1.boolean)('is_featured').notNull().default(false),
  isHighlighted: (0, pg_core_1.boolean)('is_highlighted').notNull().default(false),
  viewCount: (0, pg_core_1.integer)('view_count').notNull().default(0),
  applicationCount: (0, pg_core_1.integer)('application_count').notNull().default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.screeningQuestions = (0, pg_core_1.pgTable)('screening_questions', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => exports.jobs.id, { onDelete: 'cascade' }),
  question: (0, pg_core_1.text)('question').notNull(),
  questionType: (0, pg_core_1.varchar)('question_type', { length: 20 }).notNull(),
  options: (0, pg_core_1.text)('options').array(),
  isRequired: (0, pg_core_1.boolean)('is_required').notNull().default(true),
  order: (0, pg_core_1.integer)('order').notNull().default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.jobCategories = (0, pg_core_1.pgTable)('job_categories', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull().unique(),
  slug: (0, pg_core_1.varchar)('slug', { length: 100 }).notNull().unique(),
  description: (0, pg_core_1.text)('description'),
  icon: (0, pg_core_1.varchar)('icon', { length: 100 }),
  isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.jobCategoryRelations = (0, pg_core_1.pgTable)('job_category_relations', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => exports.jobs.id, { onDelete: 'cascade' }),
  categoryId: (0, pg_core_1.uuid)('category_id')
    .notNull()
    .references(() => exports.jobCategories.id, { onDelete: 'cascade' }),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.savedJobs = (0, pg_core_1.pgTable)('saved_jobs', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => exports.jobs.id, { onDelete: 'cascade' }),
  jobSeekerId: (0, pg_core_1.uuid)('job_seeker_id').notNull(),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.jobAlerts = (0, pg_core_1.pgTable)('job_alerts', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobSeekerId: (0, pg_core_1.uuid)('job_seeker_id').notNull(),
  keywords: (0, pg_core_1.text)('keywords').array(),
  location: (0, pg_core_1.varchar)('location', { length: 255 }),
  jobType: (0, pg_core_1.text)('job_type').array(),
  salaryMin: (0, pg_core_1.integer)('salary_min'),
  salaryMax: (0, pg_core_1.integer)('salary_max'),
  frequency: (0, pg_core_1.varchar)('frequency', { length: 20 }).notNull().default('instant'),
  isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
  lastSent: (0, pg_core_1.timestamp)('last_sent'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
//# sourceMappingURL=jobs.js.map
