import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { senderEnum } from './enums';

// Domain: Messaging (4 tables)

// Message Threads (User-to-user messaging)
export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  participants: text('participants').notNull(),
  jobId: uuid('job_id'),
  applicationId: uuid('application_id'),
  lastMessageAt: timestamp('last_message_at'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  attachments: text('attachments'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chat Sessions (Chatbot/Support)
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  messagesCount: integer('messages_count').default(0),
  escalatedToHuman: boolean('escalated_to_human').default(false),
  satisfactionRating: integer('satisfaction_rating'),
});

// Chat Messages
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  sender: senderEnum('sender').notNull(),
  message: text('message').notNull(),
  intent: varchar('intent', { length: 100 }),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
