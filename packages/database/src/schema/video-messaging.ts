import { pgTable, uuid, varchar, text, timestamp, integer, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// Video status enum
export const videoStatusEnum = pgEnum('video_status', ['uploading', 'processing', 'approved', 'rejected', 'active']);

// Privacy setting enum
export const privacySettingEnum = pgEnum('privacy_setting', ['public', 'employers_only', 'private']);

// Moderation status enum
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'rejected']);

// Sender enum
export const senderEnum = pgEnum('sender', ['user', 'bot', 'agent']);

// Video Resumes table
export const videoResumes = pgTable('video_resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  originalUrl: varchar('original_url', { length: 500 }).notNull(),
  processedUrls: text('processed_urls'), // JSON stringified
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  durationSeconds: integer('duration_seconds'),
  fileSizeMb: decimal('file_size_mb', { precision: 10, scale: 2 }),
  resolution: varchar('resolution', { length: 20 }),
  format: varchar('format', { length: 20 }),
  transcription: text('transcription'),
  status: videoStatusEnum('status').default('uploading'),
  privacySetting: privacySettingEnum('privacy_setting').default('employers_only'),
  moderationStatus: moderationStatusEnum('moderation_status').default('pending'),
  moderationNotes: text('moderation_notes'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  approvedAt: timestamp('approved_at'),
});

// Video Analytics table
export const videoAnalytics = pgTable('video_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videoResumes.id, { onDelete: 'cascade' }),
  viewerId: uuid('viewer_id').references(() => users.id, { onDelete: 'set null' }),
  viewDurationSeconds: integer('view_duration_seconds'),
  completed: boolean('completed').default(false),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

// Message Threads table
export const messageThreads = pgTable('message_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  participants: text('participants').notNull(), // JSON stringified array of user IDs
  jobId: uuid('job_id'),
  applicationId: uuid('application_id'),
  lastMessageAt: timestamp('last_message_at'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  attachments: text('attachments'), // JSON stringified array
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chat Sessions table (for chatbot)
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  messagesCount: integer('messages_count').default(0),
  escalatedToHuman: boolean('escalated_to_human').default(false),
  satisfactionRating: integer('satisfaction_rating'),
});

// Chat Messages table (for chatbot)
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  sender: senderEnum('sender').notNull(),
  message: text('message').notNull(),
  intent: varchar('intent', { length: 100 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
