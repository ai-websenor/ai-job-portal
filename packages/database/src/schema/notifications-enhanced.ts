import { pgTable, uuid, varchar, text, timestamp, boolean, integer, time, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// Frequency enum
export const frequencyEnum = pgEnum('frequency', ['instant', 'hourly', 'daily', 'weekly']);

// Notification channel enum (enhanced)
export const notificationChannelEnhancedEnum = pgEnum('notification_channel_enhanced', [
  'email',
  'push',
  'sms',
  'whatsapp',
]);

// Notification status enum
export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);

// Queue status enum
export const queueStatusEnum = pgEnum('queue_status', ['queued', 'processing', 'sent', 'failed']);

// Queue priority enum
export const queuePriorityEnum = pgEnum('queue_priority', ['high', 'medium', 'low']);

// Notification Preferences table (enhanced)
export const notificationPreferencesEnhanced = pgTable('notification_preferences_enhanced', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: varchar('notification_type', { length: 50 }).notNull(),
  emailEnabled: boolean('email_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(false),
  whatsappEnabled: boolean('whatsapp_enabled').default(false),
  frequency: frequencyEnum('frequency').default('instant'),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notification Logs table
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: varchar('notification_type', { length: 50 }).notNull(),
  channel: notificationChannelEnhancedEnum('channel').notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  status: notificationStatusEnum('status').default('pending'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON stringified
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Job Alerts table (enhanced)
export const jobAlertsEnhanced = pgTable('job_alerts_enhanced', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  searchCriteria: text('search_criteria').notNull(), // JSON stringified
  frequency: frequencyEnum('frequency').default('daily'),
  channels: text('channels'), // JSON stringified array
  isActive: boolean('is_active').default(true),
  lastTriggered: timestamp('last_triggered'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notification Queue table
export const notificationQueue = pgTable('notification_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: varchar('notification_type', { length: 50 }).notNull(),
  channel: notificationChannelEnhancedEnum('channel').notNull(),
  priority: queuePriorityEnum('priority').default('medium'),
  scheduledFor: timestamp('scheduled_for').notNull(),
  payload: text('payload').notNull(), // JSON stringified
  status: queueStatusEnum('status').default('queued'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
});
