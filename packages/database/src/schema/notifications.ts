import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users, adminUsers } from './auth';
import { notificationTypeEnum, notificationChannelEnum, notificationStatusEnum, queueStatusEnum, queuePriorityEnum } from './enums';

/**
 * User notifications across all channels
 * @example
 * {
 *   id: "notif-1234-5678-90ab-cdef11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   type: "application_update",
 *   channel: "in_app",
 *   title: "Application Status Update",
 *   message: "Your application for Senior React Developer at Infosys has been shortlisted!",
 *   metadata: "{\"jobId\":\"job-xxx\",\"applicationId\":\"app-yyy\"}",
 *   isRead: false,
 *   readAt: null
 * }
 */
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

/**
 * User notification preferences per category and channel
 * @example
 * {
 *   id: "pref-1234-5678-90ab-cdef22223333",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   jobAlerts: {"email":true,"push":true,"sms":false,"frequency":"daily"},
 *   applicationUpdates: {"email":true,"push":true,"sms":true},
 *   interviewReminders: {"email":true,"push":true,"sms":true},
 *   messages: {"email":false,"push":true,"sms":false},
 *   marketing: {"email":true,"push":false,"sms":false}
 * }
 */
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

/**
 * Pending notifications queue for async delivery
 * @example
 * {
 *   id: "queue-1234-5678-90ab-cdef33334444",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   channel: "email",
 *   templateId: "tpl-welcome-email-001",
 *   payload: {"name":"Priya","job_title":"React Developer"},
 *   priority: "high",
 *   status: "queued",
 *   scheduledFor: "2025-01-16T06:00:00Z",
 *   retryCount: "0"
 * }
 */
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

/**
 * Delivery logs for sent notifications
 * @example
 * {
 *   id: "log-1234-5678-90ab-cdef44445555",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   channel: "email",
 *   status: "delivered",
 *   messageId: "ses-msg-id-abc123xyz789",
 *   errorMessage: null,
 *   sentAt: "2025-01-15T10:30:00Z"
 * }
 */
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').notNull(),
  messageId: varchar('message_id', { length: 255 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});

/**
 * Email notification templates with variables
 * @example
 * {
 *   id: "etpl-1234-5678-90ab-cdef55556666",
 *   name: "Application Shortlisted",
 *   slug: "application-shortlisted",
 *   subject: "Great news! You've been shortlisted for {{job_title}}",
 *   body: "<h1>Hi {{name}}</h1><p>Your application for {{job_title}} at {{company}} has been shortlisted...</p>",
 *   variables: ["name","job_title","company","job_link"],
 *   isActive: true,
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
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

/**
 * SMS notification templates (160 char limit)
 * @example
 * {
 *   id: "stpl-1234-5678-90ab-cdef66667777",
 *   name: "Interview Reminder",
 *   slug: "interview-reminder",
 *   content: "Hi {{name}}, reminder: Your interview for {{job_title}} is scheduled for {{date}} at {{time}}. Good luck!",
 *   variables: ["name","job_title","date","time"],
 *   isActive: true,
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
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

/**
 * WhatsApp Business API message templates
 * @example
 * {
 *   id: "wtpl-1234-5678-90ab-cdef77778888",
 *   name: "Job Alert",
 *   templateId: "job_alert_v1",
 *   category: "UTILITY",
 *   content: "Hi {{1}}! {{2}} new jobs matching your search '{{3}}' were posted today. Tap below to view.",
 *   variables: ["name","job_count","search_name"],
 *   headerType: "text",
 *   headerContent: "New Job Alerts!",
 *   buttons: [{"type":"url","text":"View Jobs","url":"https://jobs.example.com/alerts"}],
 *   status: "approved",
 *   isActive: true
 * }
 */
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
