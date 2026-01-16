import { pgTable, uuid, varchar, text, boolean, timestamp, integer, date, index } from 'drizzle-orm/pg-core';
import { users, adminUsers } from './auth';
import { pageStatusEnum, blogStatusEnum, dataTypeEnum, relatedToTypeEnum, taskPriorityEnum, taskStatusEnum, entityTypeEnum, reportTypeEnum, reportStatusEnum, priorityEnum, ticketStatusEnum, senderTypeEnum, userRoleEnum } from './enums';

// Domain 8: Admin & CMS (13 tables)

// CMS Pages
export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  metaKeywords: text('meta_keywords'),
  status: pageStatusEnum('status').default('draft'),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by').notNull().references(() => adminUsers.id),
  updatedBy: uuid('updated_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Blog Posts
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  featuredImage: varchar('featured_image', { length: 500 }),
  category: varchar('category', { length: 100 }),
  tags: text('tags').array(),
  authorId: uuid('author_id').notNull().references(() => adminUsers.id),
  status: blogStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('idx_blog_posts_slug').on(table.slug),
  index('idx_blog_posts_status').on(table.status),
]);

// Announcements
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  targetAudience: userRoleEnum('target_audience').array(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  isDismissible: boolean('is_dismissible').default(true),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull().references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_announcements_active').on(table.isActive, table.startDate, table.endDate),
]);

// Banners
export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  linkUrl: varchar('link_url', { length: 500 }),
  position: varchar('position', { length: 50 }).notNull(),
  displayOrder: integer('display_order').default(0),
  targetAudience: userRoleEnum('target_audience').array(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_banners_position').on(table.position, table.isActive),
]);

// Admin Activity Log
export const adminActivityLog = pgTable('admin_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: uuid('resource_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  changes: text('changes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Platform Settings
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  dataType: dataTypeEnum('data_type').notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  updatedBy: uuid('updated_by').references(() => adminUsers.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tasks (Employer workspace)
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
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

// Comments (on applications, candidates, etc.)
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  commentText: text('comment_text').notNull(),
  mentions: text('mentions'),
  isImportant: boolean('is_important').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Reported Content
export const reportedContent = pgTable('reported_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  contentId: uuid('content_id').notNull(),
  reportType: reportTypeEnum('report_type').notNull(),
  description: text('description'),
  status: reportStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => adminUsers.id),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
}, (table) => [
  index('idx_reported_content_status').on(table.status),
  index('idx_reported_content_type').on(table.contentType),
]);

// Support Tickets
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  priority: priorityEnum('priority').default('medium'),
  status: ticketStatusEnum('status').default('open'),
  assignedTo: uuid('assigned_to').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

// Ticket Messages
export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderType: senderTypeEnum('sender_type').notNull(),
  senderId: uuid('sender_id').notNull(),
  message: text('message').notNull(),
  isInternalNote: boolean('is_internal_note').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
