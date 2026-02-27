import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { senderEnum } from './enums';

// Domain: Messaging (4 tables)

/**
 * Conversation threads between users (candidate-employer)
 * @example
 * {
 *   id: "thread-1234-5678-90ab-cdef11112222",
 *   participants: "550e8400-e29b-41d4-a716-446655440000,emp-aaaa-bbbb-cccc-dddd11112222",
 *   jobId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   applicationId: "app-1234-5678-90ab-cdef11112222",
 *   lastMessageAt: "2025-01-15T16:30:00Z",
 *   isArchived: false
 * }
 */
export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  participants: text('participants').notNull(),
  jobId: uuid('job_id'),
  applicationId: uuid('application_id'),
  lastMessageAt: timestamp('last_message_at'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Individual messages within a thread
 * @example
 * {
 *   id: "msg-1234-5678-90ab-cdef22223333",
 *   threadId: "thread-1234-5678-90ab-cdef11112222",
 *   senderId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   recipientId: "550e8400-e29b-41d4-a716-446655440000",
 *   subject: "Regarding your application for React Developer",
 *   body: "Hi Priya, Thank you for applying. We'd like to schedule an interview...",
 *   attachments: "[{\"name\":\"interview_details.pdf\",\"url\":\"...\"}]",
 *   isRead: true,
 *   readAt: "2025-01-15T17:00:00Z"
 * }
 */
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => messageThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  attachments: text('attachments'),
  status: varchar('status', { length: 20 }).default('sent').notNull(),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Chatbot conversation sessions
 * @example
 * {
 *   id: "chat-1234-5678-90ab-cdef33334444",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   startedAt: "2025-01-15T14:00:00Z",
 *   endedAt: "2025-01-15T14:15:00Z",
 *   messagesCount: 12,
 *   escalatedToHuman: false,
 *   satisfactionRating: 4
 * }
 */
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  messagesCount: integer('messages_count').default(0),
  escalatedToHuman: boolean('escalated_to_human').default(false),
  satisfactionRating: integer('satisfaction_rating'),
});

/**
 * Individual chatbot messages with AI intent detection
 * @example
 * {
 *   id: "cm-1234-5678-90ab-cdef44445555",
 *   sessionId: "chat-1234-5678-90ab-cdef33334444",
 *   sender: "user",
 *   message: "How do I update my resume?",
 *   intent: "resume_help",
 *   confidence: 0.92,
 *   timestamp: "2025-01-15T14:05:00Z"
 * }
 */
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  sender: senderEnum('sender').notNull(),
  message: text('message').notNull(),
  intent: varchar('intent', { length: 100 }),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
