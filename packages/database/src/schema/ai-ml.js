'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.resumeAnalysis =
  exports.parsedResumeData =
  exports.mlModels =
  exports.userRecommendationPreferences =
  exports.recommendationLogs =
  exports.userInteractions =
  exports.parsingStatusEnum =
  exports.diversityLevelEnum =
  exports.userActionEnum =
  exports.interactionTypeEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
const jobs_1 = require('./jobs');
const profiles_1 = require('./profiles');
exports.interactionTypeEnum = (0, pg_core_1.pgEnum)('interaction_type', [
  'view',
  'apply',
  'save',
  'share',
  'not_interested',
]);
exports.userActionEnum = (0, pg_core_1.pgEnum)('user_action', [
  'viewed',
  'applied',
  'saved',
  'ignored',
  'not_interested',
]);
exports.diversityLevelEnum = (0, pg_core_1.pgEnum)('diversity_level', ['low', 'medium', 'high']);
exports.parsingStatusEnum = (0, pg_core_1.pgEnum)('parsing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);
exports.userInteractions = (0, pg_core_1.pgTable)('user_interactions', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => jobs_1.jobs.id, { onDelete: 'cascade' }),
  interactionType: (0, exports.interactionTypeEnum)('interaction_type').notNull(),
  matchScore: (0, pg_core_1.decimal)('match_score', { precision: 5, scale: 2 }),
  timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
  sessionId: (0, pg_core_1.varchar)('session_id', { length: 100 }),
  metadata: (0, pg_core_1.text)('metadata'),
});
exports.recommendationLogs = (0, pg_core_1.pgTable)('recommendation_logs', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  jobId: (0, pg_core_1.uuid)('job_id')
    .notNull()
    .references(() => jobs_1.jobs.id, { onDelete: 'cascade' }),
  matchScore: (0, pg_core_1.decimal)('match_score', { precision: 5, scale: 2 }).notNull(),
  recommendationReason: (0, pg_core_1.text)('recommendation_reason'),
  algorithmVersion: (0, pg_core_1.varchar)('algorithm_version', { length: 50 }),
  userAction: (0, exports.userActionEnum)('user_action'),
  positionInList: (0, pg_core_1.integer)('position_in_list'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  actionedAt: (0, pg_core_1.timestamp)('actioned_at'),
});
exports.userRecommendationPreferences = (0, pg_core_1.pgTable)('user_recommendation_preferences', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' })
    .unique(),
  jobTypes: (0, pg_core_1.text)('job_types'),
  locations: (0, pg_core_1.text)('locations'),
  salaryMin: (0, pg_core_1.decimal)('salary_min', { precision: 10, scale: 2 }),
  salaryMax: (0, pg_core_1.decimal)('salary_max', { precision: 10, scale: 2 }),
  industries: (0, pg_core_1.text)('industries'),
  excludedCompanies: (0, pg_core_1.text)('excluded_companies'),
  diversityLevel: (0, exports.diversityLevelEnum)('diversity_level').default('medium'),
  notificationEnabled: (0, pg_core_1.boolean)('notification_enabled').default(true),
  minMatchScoreForNotification: (0, pg_core_1.integer)('min_match_score_for_notification').default(
    85,
  ),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.mlModels = (0, pg_core_1.pgTable)('ml_models', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  modelName: (0, pg_core_1.varchar)('model_name', { length: 100 }).notNull(),
  modelVersion: (0, pg_core_1.varchar)('model_version', { length: 50 }).notNull(),
  algorithmType: (0, pg_core_1.varchar)('algorithm_type', { length: 100 }),
  parameters: (0, pg_core_1.text)('parameters'),
  performanceMetrics: (0, pg_core_1.text)('performance_metrics'),
  trainingDate: (0, pg_core_1.timestamp)('training_date'),
  deploymentDate: (0, pg_core_1.timestamp)('deployment_date'),
  isActive: (0, pg_core_1.boolean)('is_active').default(false),
  createdBy: (0, pg_core_1.uuid)('created_by').references(() => users_1.users.id),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.parsedResumeData = (0, pg_core_1.pgTable)('parsed_resume_data', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  resumeId: (0, pg_core_1.uuid)('resume_id')
    .notNull()
    .references(() => profiles_1.resumes.id, { onDelete: 'cascade' }),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  personalInfo: (0, pg_core_1.text)('personal_info'),
  workExperiences: (0, pg_core_1.text)('work_experiences'),
  education: (0, pg_core_1.text)('education'),
  skills: (0, pg_core_1.text)('skills'),
  certifications: (0, pg_core_1.text)('certifications'),
  projects: (0, pg_core_1.text)('projects'),
  confidenceScores: (0, pg_core_1.text)('confidence_scores'),
  rawText: (0, pg_core_1.text)('raw_text'),
  parsedAt: (0, pg_core_1.timestamp)('parsed_at').notNull().defaultNow(),
});
exports.resumeAnalysis = (0, pg_core_1.pgTable)('resume_analysis', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  resumeId: (0, pg_core_1.uuid)('resume_id')
    .notNull()
    .references(() => profiles_1.resumes.id, { onDelete: 'cascade' }),
  qualityScore: (0, pg_core_1.decimal)('quality_score', { precision: 5, scale: 2 }),
  qualityBreakdown: (0, pg_core_1.text)('quality_breakdown'),
  atsScore: (0, pg_core_1.decimal)('ats_score', { precision: 5, scale: 2 }),
  atsIssues: (0, pg_core_1.text)('ats_issues'),
  suggestions: (0, pg_core_1.text)('suggestions'),
  keywordMatches: (0, pg_core_1.text)('keyword_matches'),
  analyzedAt: (0, pg_core_1.timestamp)('analyzed_at').notNull().defaultNow(),
});
//# sourceMappingURL=ai-ml.js.map
