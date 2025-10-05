import { pgTable, uuid, varchar, text, timestamp, boolean, date, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// Team role enum
export const teamRoleEnum = pgEnum('team_role', ['admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer']);

// Task priority enum
export const taskPriorityEnum = pgEnum('task_priority', ['high', 'medium', 'low']);

// Task status enum
export const taskStatusEnum = pgEnum('task_status', ['open', 'in_progress', 'completed', 'canceled']);

// Related to type enum
export const relatedToTypeEnum = pgEnum('related_to_type', ['job', 'candidate', 'interview']);

// Entity type enum
export const entityTypeEnum = pgEnum('entity_type', ['candidate', 'job', 'task', 'note']);

// Team Members table (enhanced for collaboration)
export const teamMembersCollaboration = pgTable('team_members_collaboration', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull(),
  permissions: text('permissions'), // JSON stringified
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  joinedAt: timestamp('joined_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  relatedToType: relatedToTypeEnum('related_to_type'),
  relatedToId: uuid('related_to_id'),
  priority: taskPriorityEnum('priority').default('medium'),
  status: taskStatusEnum('status').default('open'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Comments table
export const comments: any = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  commentText: text('comment_text').notNull(),
  mentions: text('mentions'), // JSON stringified array of user IDs
  isImportant: boolean('is_important').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Activity Logs table (team collaboration tracking)
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  changes: text('changes'), // JSON stringified
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
