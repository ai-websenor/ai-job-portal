'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.applicantTags =
  exports.applicantNotes =
  exports.jobShares =
  exports.shareChannelEnum =
  exports.jobViews =
  exports.savedSearches =
  exports.companies =
  exports.verificationStatusEnum =
  exports.companyTypeEnum =
  exports.companySizeEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
const jobs_1 = require('./jobs');
exports.companySizeEnum = (0, pg_core_1.pgEnum)('company_size', [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
]);
exports.companyTypeEnum = (0, pg_core_1.pgEnum)('company_type', [
  'startup',
  'sme',
  'mnc',
  'government',
]);
exports.verificationStatusEnum = (0, pg_core_1.pgEnum)('verification_status', [
  'pending',
  'verified',
  'rejected',
]);
exports.companies = (0, pg_core_1.pgTable)('companies', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
  slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
  industry: (0, pg_core_1.varchar)('industry', { length: 100 }),
  companySize: (0, exports.companySizeEnum)('company_size'),
  yearEstablished: (0, pg_core_1.integer)('year_established'),
  companyType: (0, exports.companyTypeEnum)('company_type'),
  website: (0, pg_core_1.varchar)('website', { length: 500 }),
  description: (0, pg_core_1.text)('description'),
  mission: (0, pg_core_1.text)('mission'),
  culture: (0, pg_core_1.text)('culture'),
  benefits: (0, pg_core_1.text)('benefits'),
  logoUrl: (0, pg_core_1.varchar)('logo_url', { length: 500 }),
  bannerUrl: (0, pg_core_1.varchar)('banner_url', { length: 500 }),
  tagline: (0, pg_core_1.varchar)('tagline', { length: 255 }),
  isVerified: (0, pg_core_1.boolean)('is_verified').default(false),
  verificationStatus: (0, exports.verificationStatusEnum)('verification_status').default('pending'),
  verificationDocuments: (0, pg_core_1.text)('verification_documents'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.savedSearches = (0, pg_core_1.pgTable)('saved_searches', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
  searchCriteria: (0, pg_core_1.text)('search_criteria').notNull(),
  alertEnabled: (0, pg_core_1.boolean)('alert_enabled').default(true),
  alertFrequency: (0, pg_core_1.varchar)('alert_frequency', { length: 20 }).default('daily'),
  alertChannels: (0, pg_core_1.text)('alert_channels'),
  lastAlertSent: (0, pg_core_1.timestamp)('last_alert_sent'),
  isActive: (0, pg_core_1.boolean)('is_active').default(true),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.jobViews = (0, pg_core_1.pgTable)('job_views', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => jobs_1.jobs.id, { onDelete: 'cascade' }),
  userId: (0, pg_core_1.uuid)('user_id').references(() => users_1.users.id, {
    onDelete: 'set null',
  }),
  viewedAt: (0, pg_core_1.timestamp)('viewed_at').notNull().defaultNow(),
  ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
  userAgent: (0, pg_core_1.text)('user_agent'),
});
exports.shareChannelEnum = (0, pg_core_1.pgEnum)('share_channel', [
  'whatsapp',
  'email',
  'linkedin',
  'twitter',
  'facebook',
  'copy_link',
]);
exports.jobShares = (0, pg_core_1.pgTable)('job_shares', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => jobs_1.jobs.id, { onDelete: 'cascade' }),
  userId: (0, pg_core_1.uuid)('user_id').references(() => users_1.users.id, {
    onDelete: 'set null',
  }),
  shareChannel: (0, exports.shareChannelEnum)('share_channel').notNull(),
  sharedAt: (0, pg_core_1.timestamp)('shared_at').notNull().defaultNow(),
});
exports.applicantNotes = (0, pg_core_1.pgTable)('applicant_notes', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  applicationId: (0, pg_core_1.uuid)('application_id').notNull(),
  authorId: (0, pg_core_1.uuid)('author_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  note: (0, pg_core_1.text)('note').notNull(),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.applicantTags = (0, pg_core_1.pgTable)('applicant_tags', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  applicationId: (0, pg_core_1.uuid)('application_id').notNull(),
  tag: (0, pg_core_1.varchar)('tag', { length: 100 }).notNull(),
  color: (0, pg_core_1.varchar)('color', { length: 20 }),
  createdBy: (0, pg_core_1.uuid)('created_by')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
//# sourceMappingURL=companies.js.map
