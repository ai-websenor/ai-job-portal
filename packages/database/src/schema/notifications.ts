import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users, adminUsers } from './auth';
import { notificationTypeEnum, notificationChannelEnum, notificationStatusEnum, queueStatusEnum, queuePriorityEnum } from './enums';

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_user_id').on(table.userId),
  index('idx_notifications_type').on(table.type),
]);

// Notification Preferences
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(false),
  whatsappEnabled: boolean('whatsapp_enabled').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notification Preferences Enhanced
export const notificationPreferencesEnhanced = pgTable('notification_preferences_enhanced', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobAlerts: jsonb('job_alerts'),
  applicationUpdates: jsonb('application_updates'),
  interviewReminders: jsonb('interview_reminders'),
  messages: jsonb('messages'),
  marketing: jsonb('marketing'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notification Queue
export const notificationQueue = pgTable('notification_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  templateId: uuid('template_id'),
  payload: jsonb('payload').notNull(),
  priority: queuePriorityEnum('priority').default('medium'),
  status: queueStatusEnum('status').default('queued'),
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  retryCount: varchar('retry_count', { length: 10 }).default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Notification Logs
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').notNull(),
  messageId: varchar('message_id', { length: 255 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  variables: jsonb('variables'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// SMS Templates
export const smsTemplates = pgTable('sms_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  content: varchar('content', { length: 500 }).notNull(),
  variables: jsonb('variables'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// WhatsApp Templates
export const whatsappTemplates = pgTable('whatsapp_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  templateId: varchar('template_id', { length: 100 }),
  category: varchar('category', { length: 50 }),
  content: text('content').notNull(),
  variables: jsonb('variables'),
  headerType: varchar('header_type', { length: 20 }),
  headerContent: text('header_content'),
  buttons: jsonb('buttons'),
  status: varchar('status', { length: 20 }).default('pending'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
