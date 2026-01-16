import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { notificationTypeEnum, notificationChannelEnum, notificationStatusEnum } from './enums';

// Domain 6: Notifications (5 tables)

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: text('data'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('notifications_user_id_idx').on(table.userId),
  index('notifications_type_idx').on(table.type),
  index('notifications_is_read_idx').on(table.isRead),
]);

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  smsEnabled: boolean('sms_enabled').notNull().default(false),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  applicationUpdates: boolean('application_updates').notNull().default(true),
  interviewReminders: boolean('interview_reminders').notNull().default(true),
  jobAlerts: boolean('job_alerts').notNull().default(true),
  promotionalEmails: boolean('promotional_emails').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  content: text('content'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('notification_logs_user_id_idx').on(table.userId),
  index('notification_logs_channel_idx').on(table.channel),
  index('notification_logs_status_idx').on(table.status),
]);

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  subject: varchar('subject', { length: 255 }).notNull(),
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content'),
  variables: text('variables'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: varchar('platform', { length: 20 }).notNull(),
  deviceId: varchar('device_id', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('push_tokens_user_id_idx').on(table.userId),
]);
