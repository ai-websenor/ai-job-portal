import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Theme Preferences
  themeMode: varchar('theme_mode', { length: 10 }).default('system'), // light, dark, system
  primaryColor: varchar('primary_color', { length: 20 }), // Hex Code
  backgroundColor: varchar('background_color', { length: 20 }), // Hex Code
  fontColor: varchar('font_color', { length: 20 }), // Hex Code

  // Notification Preferences
  notifyJobAlerts: boolean('notify_job_alerts').default(true),
  notifyApplicationUpdates: boolean('notify_application_updates').default(true),
  notifyInterviewInvites: boolean('notify_interview_invites').default(true),
  notifyMessages: boolean('notify_messages').default(true),
  notifyMarketingEmails: boolean('notify_marketing_emails').default(false),
  notifySms: boolean('notify_sms').default(false),
  notifyWhatsapp: boolean('notify_whatsapp').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
