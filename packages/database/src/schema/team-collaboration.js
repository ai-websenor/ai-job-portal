'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.activityLogs =
  exports.comments =
  exports.tasks =
  exports.teamMembersCollaboration =
  exports.entityTypeEnum =
  exports.relatedToTypeEnum =
  exports.taskStatusEnum =
  exports.taskPriorityEnum =
  exports.teamRoleEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.teamRoleEnum = (0, pg_core_1.pgEnum)('team_role', [
  'admin',
  'recruiter',
  'hiring_manager',
  'interviewer',
  'viewer',
]);
exports.taskPriorityEnum = (0, pg_core_1.pgEnum)('task_priority', ['high', 'medium', 'low']);
exports.taskStatusEnum = (0, pg_core_1.pgEnum)('task_status', [
  'open',
  'in_progress',
  'completed',
  'canceled',
]);
exports.relatedToTypeEnum = (0, pg_core_1.pgEnum)('related_to_type', [
  'job',
  'candidate',
  'interview',
]);
exports.entityTypeEnum = (0, pg_core_1.pgEnum)('entity_type', ['candidate', 'job', 'task', 'note']);
exports.teamMembersCollaboration = (0, pg_core_1.pgTable)('team_members_collaboration', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  role: (0, exports.teamRoleEnum)('role').notNull(),
  permissions: (0, pg_core_1.text)('permissions'),
  invitedBy: (0, pg_core_1.uuid)('invited_by').references(() => users_1.users.id),
  invitedAt: (0, pg_core_1.timestamp)('invited_at').notNull().defaultNow(),
  joinedAt: (0, pg_core_1.timestamp)('joined_at'),
  isActive: (0, pg_core_1.boolean)('is_active').default(true),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  createdBy: (0, pg_core_1.uuid)('created_by')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  assignedTo: (0, pg_core_1.uuid)('assigned_to').references(() => users_1.users.id, {
    onDelete: 'set null',
  }),
  title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
  description: (0, pg_core_1.text)('description'),
  relatedToType: (0, exports.relatedToTypeEnum)('related_to_type'),
  relatedToId: (0, pg_core_1.uuid)('related_to_id'),
  priority: (0, exports.taskPriorityEnum)('priority').default('medium'),
  status: (0, exports.taskStatusEnum)('status').default('open'),
  dueDate: (0, pg_core_1.date)('due_date'),
  completedAt: (0, pg_core_1.timestamp)('completed_at'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.comments = (0, pg_core_1.pgTable)('comments', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  authorId: (0, pg_core_1.uuid)('author_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  parentId: (0, pg_core_1.uuid)('parent_id'),
  entityType: (0, exports.entityTypeEnum)('entity_type').notNull(),
  entityId: (0, pg_core_1.uuid)('entity_id').notNull(),
  commentText: (0, pg_core_1.text)('comment_text').notNull(),
  mentions: (0, pg_core_1.text)('mentions'),
  isImportant: (0, pg_core_1.boolean)('is_important').default(false),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.activityLogs = (0, pg_core_1.pgTable)('activity_logs', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(),
  entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(),
  entityId: (0, pg_core_1.uuid)('entity_id'),
  changes: (0, pg_core_1.text)('changes'),
  ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
  userAgent: (0, pg_core_1.text)('user_agent'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
//# sourceMappingURL=team-collaboration.js.map
