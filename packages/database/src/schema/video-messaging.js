'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.chatMessages =
  exports.chatSessions =
  exports.messages =
  exports.messageThreads =
  exports.videoAnalytics =
  exports.videoResumes =
  exports.senderEnum =
  exports.moderationStatusEnum =
  exports.privacySettingEnum =
  exports.videoStatusEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.videoStatusEnum = (0, pg_core_1.pgEnum)('video_status', [
  'uploading',
  'processing',
  'approved',
  'rejected',
  'active',
]);
exports.privacySettingEnum = (0, pg_core_1.pgEnum)('privacy_setting', [
  'public',
  'employers_only',
  'private',
]);
exports.moderationStatusEnum = (0, pg_core_1.pgEnum)('moderation_status', [
  'pending',
  'approved',
  'rejected',
]);
exports.senderEnum = (0, pg_core_1.pgEnum)('sender', ['user', 'bot', 'agent']);
exports.videoResumes = (0, pg_core_1.pgTable)('video_resumes', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
  originalUrl: (0, pg_core_1.varchar)('original_url', { length: 500 }).notNull(),
  processedUrls: (0, pg_core_1.text)('processed_urls'),
  thumbnailUrl: (0, pg_core_1.varchar)('thumbnail_url', { length: 500 }),
  durationSeconds: (0, pg_core_1.integer)('duration_seconds'),
  fileSizeMb: (0, pg_core_1.decimal)('file_size_mb', { precision: 10, scale: 2 }),
  resolution: (0, pg_core_1.varchar)('resolution', { length: 20 }),
  format: (0, pg_core_1.varchar)('format', { length: 20 }),
  transcription: (0, pg_core_1.text)('transcription'),
  status: (0, exports.videoStatusEnum)('status').default('uploading'),
  privacySetting: (0, exports.privacySettingEnum)('privacy_setting').default('employers_only'),
  moderationStatus: (0, exports.moderationStatusEnum)('moderation_status').default('pending'),
  moderationNotes: (0, pg_core_1.text)('moderation_notes'),
  uploadedAt: (0, pg_core_1.timestamp)('uploaded_at').notNull().defaultNow(),
  processedAt: (0, pg_core_1.timestamp)('processed_at'),
  approvedAt: (0, pg_core_1.timestamp)('approved_at'),
});
exports.videoAnalytics = (0, pg_core_1.pgTable)('video_analytics', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  videoId: (0, pg_core_1.uuid)('video_id')
    .notNull()
    .references(() => exports.videoResumes.id, { onDelete: 'cascade' }),
  viewerId: (0, pg_core_1.uuid)('viewer_id').references(() => users_1.users.id, {
    onDelete: 'set null',
  }),
  viewDurationSeconds: (0, pg_core_1.integer)('view_duration_seconds'),
  completed: (0, pg_core_1.boolean)('completed').default(false),
  viewedAt: (0, pg_core_1.timestamp)('viewed_at').notNull().defaultNow(),
  ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
  userAgent: (0, pg_core_1.text)('user_agent'),
});
exports.messageThreads = (0, pg_core_1.pgTable)('message_threads', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  participants: (0, pg_core_1.text)('participants').notNull(),
  jobId: (0, pg_core_1.uuid)('job_id'),
  applicationId: (0, pg_core_1.uuid)('application_id'),
  lastMessageAt: (0, pg_core_1.timestamp)('last_message_at'),
  isArchived: (0, pg_core_1.boolean)('is_archived').default(false),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.messages = (0, pg_core_1.pgTable)('messages', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  threadId: (0, pg_core_1.uuid)('thread_id')
    .notNull()
    .references(() => exports.messageThreads.id, { onDelete: 'cascade' }),
  senderId: (0, pg_core_1.uuid)('sender_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  recipientId: (0, pg_core_1.uuid)('recipient_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  subject: (0, pg_core_1.varchar)('subject', { length: 255 }),
  body: (0, pg_core_1.text)('body').notNull(),
  attachments: (0, pg_core_1.text)('attachments'),
  isRead: (0, pg_core_1.boolean)('is_read').default(false),
  readAt: (0, pg_core_1.timestamp)('read_at'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.chatSessions = (0, pg_core_1.pgTable)('chat_sessions', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id').references(() => users_1.users.id, {
    onDelete: 'set null',
  }),
  startedAt: (0, pg_core_1.timestamp)('started_at').notNull().defaultNow(),
  endedAt: (0, pg_core_1.timestamp)('ended_at'),
  messagesCount: (0, pg_core_1.integer)('messages_count').default(0),
  escalatedToHuman: (0, pg_core_1.boolean)('escalated_to_human').default(false),
  satisfactionRating: (0, pg_core_1.integer)('satisfaction_rating'),
});
exports.chatMessages = (0, pg_core_1.pgTable)('chat_messages', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  sessionId: (0, pg_core_1.uuid)('session_id')
    .notNull()
    .references(() => exports.chatSessions.id, { onDelete: 'cascade' }),
  sender: (0, exports.senderEnum)('sender').notNull(),
  message: (0, pg_core_1.text)('message').notNull(),
  intent: (0, pg_core_1.varchar)('intent', { length: 100 }),
  confidence: (0, pg_core_1.decimal)('confidence', { precision: 5, scale: 2 }),
  timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
});
//# sourceMappingURL=video-messaging.js.map
