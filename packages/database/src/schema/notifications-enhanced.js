'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.notificationQueue =
  exports.jobAlertsEnhanced =
  exports.notificationLogs =
  exports.notificationPreferencesEnhanced =
  exports.queuePriorityEnum =
  exports.queueStatusEnum =
  exports.notificationStatusEnum =
  exports.notificationChannelEnhancedEnum =
  exports.frequencyEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.frequencyEnum = (0, pg_core_1.pgEnum)('frequency', [
  'instant',
  'hourly',
  'daily',
  'weekly',
]);
exports.notificationChannelEnhancedEnum = (0, pg_core_1.pgEnum)('notification_channel_enhanced', [
  'email',
  'push',
  'sms',
  'whatsapp',
]);
exports.notificationStatusEnum = (0, pg_core_1.pgEnum)('notification_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);
exports.queueStatusEnum = (0, pg_core_1.pgEnum)('queue_status', [
  'queued',
  'processing',
  'sent',
  'failed',
]);
exports.queuePriorityEnum = (0, pg_core_1.pgEnum)('queue_priority', ['high', 'medium', 'low']);
exports.notificationPreferencesEnhanced = (0, pg_core_1.pgTable)(
  'notification_preferences_enhanced',
  {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
      .notNull()
      .references(() => users_1.users.id, { onDelete: 'cascade' }),
    notificationType: (0, pg_core_1.varchar)('notification_type', { length: 50 }).notNull(),
    emailEnabled: (0, pg_core_1.boolean)('email_enabled').default(true),
    pushEnabled: (0, pg_core_1.boolean)('push_enabled').default(true),
    smsEnabled: (0, pg_core_1.boolean)('sms_enabled').default(false),
    whatsappEnabled: (0, pg_core_1.boolean)('whatsapp_enabled').default(false),
    frequency: (0, exports.frequencyEnum)('frequency').default('instant'),
    quietHoursStart: (0, pg_core_1.time)('quiet_hours_start'),
    quietHoursEnd: (0, pg_core_1.time)('quiet_hours_end'),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 50 }).default('UTC'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
  },
);
exports.notificationLogs = (0, pg_core_1.pgTable)('notification_logs', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  notificationType: (0, pg_core_1.varchar)('notification_type', { length: 50 }).notNull(),
  channel: (0, exports.notificationChannelEnhancedEnum)('channel').notNull(),
  recipient: (0, pg_core_1.varchar)('recipient', { length: 255 }).notNull(),
  subject: (0, pg_core_1.varchar)('subject', { length: 255 }),
  message: (0, pg_core_1.text)('message').notNull(),
  status: (0, exports.notificationStatusEnum)('status').default('pending'),
  sentAt: (0, pg_core_1.timestamp)('sent_at'),
  deliveredAt: (0, pg_core_1.timestamp)('delivered_at'),
  openedAt: (0, pg_core_1.timestamp)('opened_at'),
  clickedAt: (0, pg_core_1.timestamp)('clicked_at'),
  errorMessage: (0, pg_core_1.text)('error_message'),
  metadata: (0, pg_core_1.text)('metadata'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.jobAlertsEnhanced = (0, pg_core_1.pgTable)('job_alerts_enhanced', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
  searchCriteria: (0, pg_core_1.text)('search_criteria').notNull(),
  frequency: (0, exports.frequencyEnum)('frequency').default('daily'),
  channels: (0, pg_core_1.text)('channels'),
  isActive: (0, pg_core_1.boolean)('is_active').default(true),
  lastTriggered: (0, pg_core_1.timestamp)('last_triggered'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.notificationQueue = (0, pg_core_1.pgTable)('notification_queue', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  notificationType: (0, pg_core_1.varchar)('notification_type', { length: 50 }).notNull(),
  channel: (0, exports.notificationChannelEnhancedEnum)('channel').notNull(),
  priority: (0, exports.queuePriorityEnum)('priority').default('medium'),
  scheduledFor: (0, pg_core_1.timestamp)('scheduled_for').notNull(),
  payload: (0, pg_core_1.text)('payload').notNull(),
  status: (0, exports.queueStatusEnum)('status').default('queued'),
  retryCount: (0, pg_core_1.integer)('retry_count').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  processedAt: (0, pg_core_1.timestamp)('processed_at'),
});
//# sourceMappingURL=notifications-enhanced.js.map
