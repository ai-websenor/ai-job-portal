'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.teamMembers =
  exports.employers =
  exports.subscriptionPlanEnum =
  exports.education =
  exports.workExperience =
  exports.jobSeekers =
  exports.users =
  exports.userRoleEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', [
  'candidate',
  'employer',
  'admin',
  'team_member',
]);
exports.users = (0, pg_core_1.pgTable)('users', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
  lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
  email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
  password: (0, pg_core_1.varchar)('password', { length: 255 }).notNull(),
  mobile: (0, pg_core_1.varchar)('mobile', { length: 20 }).notNull(),
  role: (0, exports.userRoleEnum)('role').notNull().default('candidate'),
  isVerified: (0, pg_core_1.boolean)('is_verified').notNull().default(false),
  isMobileVerified: (0, pg_core_1.boolean)('is_mobile_verified').notNull().default(false),
  isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
  twoFactorSecret: (0, pg_core_1.varchar)('two_factor_secret', { length: 255 }),
  twoFactorEnabled: (0, pg_core_1.boolean)('two_factor_enabled').notNull().default(false),
  lastLoginAt: (0, pg_core_1.timestamp)('last_login_at'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
  resumeDetails: (0, pg_core_1.jsonb)('resume_details'),
  onboardingStep: (0, pg_core_1.integer)('onboarding_step').default(0),
  isOnboardingCompleted: (0, pg_core_1.boolean)('is_onboarding_completed').default(false),
});
exports.jobSeekers = (0, pg_core_1.pgTable)('job_seekers', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
  lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
  phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
  location: (0, pg_core_1.varchar)('location', { length: 255 }),
  bio: (0, pg_core_1.text)('bio'),
  resumeUrl: (0, pg_core_1.varchar)('resume_url', { length: 500 }),
  videoResumeUrl: (0, pg_core_1.varchar)('video_resume_url', { length: 500 }),
  skills: (0, pg_core_1.text)('skills').array(),
  profileCompleteness: (0, pg_core_1.varchar)('profile_completeness', { length: 10 }).default('0'),
  isPublic: (0, pg_core_1.boolean)('is_public').notNull().default(true),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.workExperience = (0, pg_core_1.pgTable)('work_experience', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobSeekerId: (0, pg_core_1.uuid)('job_seeker_id')
    .notNull()
    .references(() => exports.jobSeekers.id, { onDelete: 'cascade' }),
  company: (0, pg_core_1.varchar)('company', { length: 255 }).notNull(),
  title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
  startDate: (0, pg_core_1.timestamp)('start_date').notNull(),
  endDate: (0, pg_core_1.timestamp)('end_date'),
  isCurrent: (0, pg_core_1.boolean)('is_current').notNull().default(false),
  description: (0, pg_core_1.text)('description'),
  location: (0, pg_core_1.varchar)('location', { length: 255 }),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.education = (0, pg_core_1.pgTable)('education', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobSeekerId: (0, pg_core_1.uuid)('job_seeker_id')
    .notNull()
    .references(() => exports.jobSeekers.id, { onDelete: 'cascade' }),
  institution: (0, pg_core_1.varchar)('institution', { length: 255 }).notNull(),
  degree: (0, pg_core_1.varchar)('degree', { length: 255 }).notNull(),
  field: (0, pg_core_1.varchar)('field', { length: 255 }),
  startDate: (0, pg_core_1.timestamp)('start_date').notNull(),
  endDate: (0, pg_core_1.timestamp)('end_date'),
  description: (0, pg_core_1.text)('description'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.subscriptionPlanEnum = (0, pg_core_1.pgEnum)('subscription_plan', [
  'free',
  'basic',
  'premium',
  'enterprise',
]);
exports.employers = (0, pg_core_1.pgTable)('employers', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }).notNull(),
  companyLogo: (0, pg_core_1.varchar)('company_logo', { length: 500 }),
  website: (0, pg_core_1.varchar)('website', { length: 255 }),
  industry: (0, pg_core_1.varchar)('industry', { length: 100 }),
  companySize: (0, pg_core_1.varchar)('company_size', { length: 50 }),
  description: (0, pg_core_1.text)('description'),
  isVerified: (0, pg_core_1.boolean)('is_verified').notNull().default(false),
  subscriptionPlan: (0, exports.subscriptionPlanEnum)('subscription_plan')
    .notNull()
    .default('free'),
  subscriptionExpiresAt: (0, pg_core_1.timestamp)('subscription_expires_at'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.teamMembers = (0, pg_core_1.pgTable)('team_members', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  employerId: (0, pg_core_1.uuid)('employer_id')
    .notNull()
    .references(() => exports.employers.id, { onDelete: 'cascade' }),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  role: (0, pg_core_1.varchar)('role', { length: 50 }).notNull(),
  permissions: (0, pg_core_1.text)('permissions').array(),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
//# sourceMappingURL=users.js.map
