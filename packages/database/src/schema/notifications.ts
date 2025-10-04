import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// Notification type enum
export const notificationTypeEnum = pgEnum('notification_type', [
  'job_alert',
  'application_update',
  'interview',
  'message',
  'system',
]);

// Notification channel enum
export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'sms',
  'whatsapp',
  'push',
]);

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'), // JSON string for additional data
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Notification Preferences table
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobAlerts: boolean('job_alerts').notNull().default(true),
  applicationUpdates: boolean('application_updates').notNull().default(true),
  interviewReminders: boolean('interview_reminders').notNull().default(true),
  messages: boolean('messages').notNull().default(true),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  smsEnabled: boolean('sms_enabled').notNull().default(false),
  whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
