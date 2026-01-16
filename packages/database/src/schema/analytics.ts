import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Domain 9: Analytics (3 tables)

// Activity Logs (Company-scoped user actions)
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

// Analytics Events (Platform-wide event tracking)
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

// Metric Cache (Precomputed metrics for dashboards)
export const metricCache = pgTable('metric_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  metricValue: text('metric_value').notNull(),
  period: varchar('period', { length: 50 }).notNull(),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});
