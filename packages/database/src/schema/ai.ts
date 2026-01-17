import { pgTable, uuid, varchar, text, timestamp, integer, numeric, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { jobs } from './jobs';
import { userActionEnum, interactionTypeEnum } from './enums';

// Domain 10: AI/ML (4 tables)

/**
 * AI-generated job recommendations for candidates
 * @example
 * {
 *   id: "rec-1234-5678-90ab-cdef11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   score: 92,
 *   reason: "Strong match: 5 of 6 required skills, similar experience level, preferred location"
 * }
 */
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

/**
 * Recommendation effectiveness tracking for ML feedback
 * @example
 * {
 *   id: "rlog-1234-5678-90ab-cdef22223333",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   matchScore: 92.5,
 *   recommendationReason: "Skills match: React, TypeScript, Node.js | Location: Bangalore",
 *   algorithmVersion: "v2.3.1-collaborative-filtering",
 *   userAction: "applied",
 *   positionInList: 3,
 *   actionedAt: "2025-01-15T15:30:00Z"
 * }
 */
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

/**
 * User-job interactions for ML model training
 * @example
 * {
 *   id: "int-1234-5678-90ab-cdef33334444",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   interactionType: "view",
 *   matchScore: 85.0,
 *   timestamp: "2025-01-15T14:25:00Z",
 *   sessionId: "sess_abc123xyz789",
 *   metadata: "{\"time_spent_seconds\":45,\"scroll_depth\":0.8}"
 * }
 */
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

/**
 * ML model registry for versioning and deployment tracking
 * @example
 * {
 *   id: "model-1234-5678-90ab-cdef44445555",
 *   modelName: "job-recommendation-engine",
 *   modelVersion: "v2.3.1",
 *   algorithmType: "collaborative-filtering-hybrid",
 *   parameters: "{\"embedding_dim\":128,\"learning_rate\":0.001}",
 *   performanceMetrics: "{\"precision\":0.82,\"recall\":0.78,\"ndcg\":0.85}",
 *   trainingDate: "2025-01-10T02:00:00Z",
 *   deploymentDate: "2025-01-12T00:00:00Z",
 *   isActive: true,
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
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
