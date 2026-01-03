"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferences = exports.notifications = exports.notificationChannelEnum = exports.notificationTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.notificationTypeEnum = (0, pg_core_1.pgEnum)('notification_type', [
    'job_alert',
    'application_update',
    'interview',
    'message',
    'system',
]);
exports.notificationChannelEnum = (0, pg_core_1.pgEnum)('notification_channel', [
    'email',
    'sms',
    'whatsapp',
    'push',
]);
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    type: (0, exports.notificationTypeEnum)('type').notNull(),
    channel: (0, exports.notificationChannelEnum)('channel').notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    metadata: (0, pg_core_1.text)('metadata'),
    isRead: (0, pg_core_1.boolean)('is_read').notNull().default(false),
    readAt: (0, pg_core_1.timestamp)('read_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.notificationPreferences = (0, pg_core_1.pgTable)('notification_preferences', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    jobAlerts: (0, pg_core_1.boolean)('job_alerts').notNull().default(true),
    applicationUpdates: (0, pg_core_1.boolean)('application_updates').notNull().default(true),
    interviewReminders: (0, pg_core_1.boolean)('interview_reminders').notNull().default(true),
    messages: (0, pg_core_1.boolean)('messages').notNull().default(true),
    emailEnabled: (0, pg_core_1.boolean)('email_enabled').notNull().default(true),
    smsEnabled: (0, pg_core_1.boolean)('sms_enabled').notNull().default(false),
    whatsappEnabled: (0, pg_core_1.boolean)('whatsapp_enabled').notNull().default(false),
    pushEnabled: (0, pg_core_1.boolean)('push_enabled').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
//# sourceMappingURL=notifications.js.map