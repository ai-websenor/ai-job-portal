import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Domain 9: Analytics (3 tables)

/**
 * Company-scoped user action audit trail
 * @example
 * {
 *   id: "log-1234-5678-90ab-cdef11112222",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   userId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   action: "job.create",
 *   entityType: "job",
 *   entityId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   changes: "{\"title\":\"Senior React Developer\",\"salary_min\":1800000}",
 *   ipAddress: "103.15.67.89",
 *   userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
 * }
 */
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  changes: text('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Platform-wide event tracking for analytics
 * @example
 * {
 *   id: "evt-1234-5678-90ab-cdef22223333",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   eventName: "job_view",
 *   eventProperties: "{\"job_id\":\"job-xxx\",\"source\":\"search_results\",\"position\":3}",
 *   timestamp: "2025-01-15T14:30:00Z",
 *   sessionId: "sess_abc123xyz789",
 *   ipAddress: "103.15.67.89",
 *   userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"
 * }
 */
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventName: varchar('event_name', { length: 100 }).notNull(),
  eventProperties: text('event_properties'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  sessionId: varchar('session_id', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

/**
 * Precomputed metrics cache for dashboard performance
 * @example
 * {
 *   id: "mc-1234-5678-90ab-cdef33334444",
 *   metricName: "total_active_jobs",
 *   metricValue: "{\"count\":15234,\"change_pct\":5.2}",
 *   period: "daily",
 *   calculatedAt: "2025-01-15T00:05:00Z",
 *   expiresAt: "2025-01-16T00:05:00Z"
 * }
 */
export const metricCache = pgTable('metric_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  metricValue: text('metric_value').notNull(),
  period: varchar('period', { length: 50 }).notNull(),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});
