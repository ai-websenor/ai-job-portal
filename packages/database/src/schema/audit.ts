import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './auth';

/**
 * Audit logs for tracking sensitive actions
 * Captures who did what, when, and what changed
 *
 * @example
 * {
 *   id: "audit-1234-5678-90ab-cdef",
 *   userId: "user-id",
 *   action: "CREATE_COMPANY",
 *   resource: "company",
 *   resourceId: "company-id",
 *   oldValue: null,
 *   newValue: { name: "Tech Corp", ... },
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 *   status: "success",
 *   errorMessage: null
 * }
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(), // e.g., 'CREATE_COMPANY', 'DELETE_USER'
    resource: varchar('resource', { length: 50 }).notNull(), // e.g., 'company', 'user', 'role'
    resourceId: varchar('resource_id', { length: 255 }), // ID of the affected resource
    oldValue: jsonb('old_value'), // Previous state (for updates/deletes)
    newValue: jsonb('new_value'), // New state (for creates/updates)
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
    userAgent: text('user_agent'), // Browser/client info
    status: varchar('status', { length: 20 }).notNull(), // 'success' or 'failure'
    errorMessage: text('error_message'), // Error details if status=failure
    metadata: jsonb('metadata'), // Additional context (e.g., request ID, session ID)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_user_idx').on(table.userId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_idx').on(table.resource),
    index('audit_logs_created_idx').on(table.createdAt),
  ],
);
