import { pgTable, uuid, varchar, text, timestamp, integer, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { jobs } from './jobs';
import { resumes } from './profiles';

// Interaction type enum
export const interactionTypeEnum = pgEnum('interaction_type', ['view', 'apply', 'save', 'share', 'not_interested']);

// User action enum
export const userActionEnum = pgEnum('user_action', ['viewed', 'applied', 'saved', 'ignored', 'not_interested']);

// Diversity level enum
export const diversityLevelEnum = pgEnum('diversity_level', ['low', 'medium', 'high']);

// Parsing status enum
export const parsingStatusEnum = pgEnum('parsing_status', ['pending', 'processing', 'completed', 'failed']);

// User Interactions table (for ML recommendations)
export const userInteractions = pgTable('user_interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  matchScore: decimal('match_score', { precision: 5, scale: 2 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  sessionId: varchar('session_id', { length: 100 }),
  metadata: text('metadata'), // JSON stringified
});

// Recommendation Logs table
export const recommendationLogs = pgTable('recommendation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  matchScore: decimal('match_score', { precision: 5, scale: 2 }).notNull(),
  recommendationReason: text('recommendation_reason'),
  algorithmVersion: varchar('algorithm_version', { length: 50 }),
  userAction: userActionEnum('user_action'),
  positionInList: integer('position_in_list'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  actionedAt: timestamp('actioned_at'),
});

// User Job Preferences table
export const userJobPreferences = pgTable('user_job_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  jobTypes: text('job_types'), // JSON stringified array
  locations: text('locations'), // JSON stringified array
  salaryMin: decimal('salary_min', { precision: 10, scale: 2 }),
  salaryMax: decimal('salary_max', { precision: 10, scale: 2 }),
  industries: text('industries'), // JSON stringified array
  excludedCompanies: text('excluded_companies'), // JSON stringified array
  diversityLevel: diversityLevelEnum('diversity_level').default('medium'),
  notificationEnabled: boolean('notification_enabled').default(true),
  minMatchScoreForNotification: integer('min_match_score_for_notification').default(85),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ML Models table
export const mlModels = pgTable('ml_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }).notNull(),
  algorithmType: varchar('algorithm_type', { length: 100 }),
  parameters: text('parameters'), // JSON stringified
  performanceMetrics: text('performance_metrics'), // JSON stringified
  trainingDate: timestamp('training_date'),
  deploymentDate: timestamp('deployment_date'),
  isActive: boolean('is_active').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Parsed Resume Data table (AI resume parsing)
export const parsedResumeData = pgTable('parsed_resume_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  resumeId: uuid('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personalInfo: text('personal_info'), // JSON stringified
  workExperiences: text('work_experiences'), // JSON stringified
  education: text('education'), // JSON stringified
  skills: text('skills'), // JSON stringified
  certifications: text('certifications'), // JSON stringified
  projects: text('projects'), // JSON stringified
  confidenceScores: text('confidence_scores'), // JSON stringified
  rawText: text('raw_text'),
  parsedAt: timestamp('parsed_at').notNull().defaultNow(),
});

// Resume Analysis table
export const resumeAnalysis = pgTable('resume_analysis', {
  id: uuid('id').defaultRandom().primaryKey(),
  resumeId: uuid('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
  qualityBreakdown: text('quality_breakdown'), // JSON stringified
  atsScore: decimal('ats_score', { precision: 5, scale: 2 }),
  atsIssues: text('ats_issues'), // JSON stringified
  suggestions: text('suggestions'), // JSON stringified
  keywordMatches: text('keyword_matches'), // JSON stringified
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
});
