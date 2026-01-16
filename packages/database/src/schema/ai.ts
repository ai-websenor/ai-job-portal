import { pgTable, uuid, varchar, text, timestamp, integer, numeric, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';
import { userActionEnum, interactionTypeEnum } from './enums';

// Domain 10: AI/ML (4 tables)

// Job Recommendations
export const jobRecommendations = pgTable('job_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_job_recommendations_user_score').on(table.userId, table.score),
]);

// Recommendation Logs (Algorithm effectiveness tracking)
export const recommendationLogs = pgTable('recommendation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  matchScore: numeric('match_score', { precision: 5, scale: 2 }).notNull(),
  recommendationReason: text('recommendation_reason'),
  algorithmVersion: varchar('algorithm_version', { length: 50 }),
  userAction: userActionEnum('user_action'),
  positionInList: integer('position_in_list'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  actionedAt: timestamp('actioned_at'),
});

// User Interactions (ML training data)
export const userInteractions = pgTable('user_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  matchScore: numeric('match_score', { precision: 5, scale: 2 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  sessionId: varchar('session_id', { length: 100 }),
  metadata: text('metadata'),
});

// ML Models (Model registry)
export const mlModels = pgTable('ml_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }).notNull(),
  algorithmType: varchar('algorithm_type', { length: 100 }),
  parameters: text('parameters'),
  performanceMetrics: text('performance_metrics'),
  trainingDate: timestamp('training_date'),
  deploymentDate: timestamp('deployment_date'),
  isActive: boolean('is_active').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
