import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { contentStatusEnum, reportStatusEnum, reportTypeEnum, auditActionEnum } from './enums';

// Domain 8: Admin (8 tables)

export const adminSettings = pgTable('admin_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  status: contentStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('cms_pages_slug_idx').on(table.slug),
  index('cms_pages_status_idx').on(table.status),
]);

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content'),
  featuredImage: text('featured_image'),
  authorId: uuid('author_id').references(() => users.id),
  status: contentStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  tags: text('tags'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('blog_posts_slug_idx').on(table.slug),
  index('blog_posts_status_idx').on(table.status),
  index('blog_posts_author_id_idx').on(table.authorId),
]);

export const faqs = pgTable('faqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: varchar('category', { length: 100 }),
  sortOrder: boolean('sort_order').default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportedBy: uuid('reported_by').notNull().references(() => users.id),
  type: reportTypeEnum('type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  status: reportStatusEnum('status').notNull().default('pending'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  resolution: text('resolution'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('reports_type_target_idx').on(table.type, table.targetId),
  index('reports_status_idx').on(table.status),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  oldData: text('old_data'),
  newData: text('new_data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('audit_logs_user_id_idx').on(table.userId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_entity_idx').on(table.entityType, table.entityId),
]);

export const bannedEmails = pgTable('banned_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  reason: text('reason'),
  bannedBy: uuid('banned_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const systemAnnouncements = pgTable('system_announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('info'),
  targetRoles: text('target_roles'),
  isActive: boolean('is_active').notNull().default(true),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
