import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users, adminUsers } from './auth';
import {
  pageStatusEnum,
  blogStatusEnum,
  dataTypeEnum,
  relatedToTypeEnum,
  taskPriorityEnum,
  taskStatusEnum,
  entityTypeEnum,
  reportTypeEnum,
  reportStatusEnum,
  priorityEnum,
  ticketStatusEnum,
  senderTypeEnum,
  userRoleEnum,
} from './enums';

// Domain 8: Admin & CMS (13 tables)

/**
 * CMS pages for static content (about, terms, privacy, etc.)
 * @example
 * {
 *   id: "cms-1234-5678-90ab-cdef11112222",
 *   slug: "about-us",
 *   title: "About Us | Leading Job Portal in India",
 *   content: "<h1>About JobPortal</h1><p>We connect talent with opportunities...</p>",
 *   metaTitle: "About Us - India's #1 Job Portal",
 *   metaDescription: "Learn about JobPortal, connecting millions of job seekers with top employers across India",
 *   metaKeywords: "job portal, careers, recruitment, India jobs",
 *   status: "published",
 *   publishedAt: "2024-06-01T00:00:00Z",
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
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
  createdBy: uuid('created_by')
    .notNull()
    .references(() => adminUsers.id),
  updatedBy: uuid('updated_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Blog articles for career advice and industry insights
 * @example
 * {
 *   id: "blog-1234-5678-90ab-cdef22223333",
 *   title: "Top 10 Resume Tips for 2025",
 *   slug: "top-10-resume-tips-2025",
 *   excerpt: "Make your resume stand out with these expert tips...",
 *   content: "<article>...</article>",
 *   featuredImage: "https://cdn.jobportal.in/blog/resume-tips-2025.jpg",
 *   category: "Career Advice",
 *   tags: ["resume", "job search", "career tips"],
 *   authorId: "admin-xxxx-yyyy",
 *   status: "published",
 *   publishedAt: "2025-01-10T09:00:00Z",
 *   viewCount: 4521
 * }
 */
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    featuredImage: varchar('featured_image', { length: 500 }),
    category: varchar('category', { length: 100 }),
    tags: text('tags').array(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => adminUsers.id),
    status: blogStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    viewCount: integer('view_count').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_blog_posts_slug').on(table.slug),
    index('idx_blog_posts_status').on(table.status),
  ],
);

/**
 * Platform-wide announcements and notifications
 * @example
 * {
 *   id: "ann-1234-5678-90ab-cdef33334444",
 *   title: "Platform Maintenance Notice",
 *   content: "JobPortal will be undergoing scheduled maintenance on Jan 20, 2025 from 2 AM to 4 AM IST.",
 *   type: "info",
 *   targetAudience: ["candidate", "employer"],
 *   startDate: "2025-01-18T00:00:00Z",
 *   endDate: "2025-01-20T04:00:00Z",
 *   isDismissible: true,
 *   isActive: true,
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    targetAudience: userRoleEnum('target_audience').array(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    isDismissible: boolean('is_dismissible').default(true),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => adminUsers.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_announcements_active').on(table.isActive, table.startDate, table.endDate)],
);

/**
 * Promotional banners displayed across the platform
 * @example
 * {
 *   id: "ban-1234-5678-90ab-cdef44445555",
 *   title: "Premium Plan - 30% Off",
 *   imageUrl: "https://cdn.jobportal.in/banners/premium-offer-jan25.jpg",
 *   linkUrl: "/pricing?utm_source=banner&utm_campaign=jan25",
 *   position: "homepage_hero",
 *   displayOrder: 1,
 *   targetAudience: ["employer"],
 *   startDate: "2025-01-01T00:00:00Z",
 *   endDate: "2025-01-31T23:59:59Z",
 *   isActive: true,
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
export const banners = pgTable(
  'banners',
  {
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
  },
  (table) => [index('idx_banners_position').on(table.position, table.isActive)],
);

/**
 * Audit log for admin actions
 * @example
 * {
 *   id: "log-1234-5678-90ab-cdef55556666",
 *   adminUserId: "admin-xxxx-yyyy",
 *   action: "user.ban",
 *   resourceType: "user",
 *   resourceId: "550e8400-e29b-41d4-a716-446655440000",
 *   ipAddress: "103.15.67.89",
 *   userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
 *   changes: "{\"reason\":\"Terms violation\",\"duration\":\"permanent\"}"
 * }
 */
export const adminActivityLog = pgTable('admin_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: uuid('resource_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  changes: text('changes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * System-wide configuration settings
 * @example
 * {
 *   id: "set-1234-5678-90ab-cdef66667777",
 *   key: "max_job_posts_free_plan",
 *   value: "3",
 *   dataType: "integer",
 *   category: "subscription",
 *   description: "Maximum job posts allowed on free plan",
 *   isPublic: false,
 *   updatedBy: "admin-xxxx-yyyy"
 * }
 */
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

/**
 * Employer workspace tasks for recruitment workflow
 * @example
 * {
 *   id: "task-1234-5678-90ab-cdef77778888",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   createdBy: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   assignedTo: "team-1234-5678-90ab-cdef33334444",
 *   title: "Review shortlisted candidates for React position",
 *   description: "Review 15 shortlisted candidates and schedule interviews",
 *   relatedToType: "job",
 *   relatedToId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   priority: "high",
 *   status: "in_progress",
 *   dueDate: "2025-01-20"
 * }
 */
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
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

/**
 * Team comments on applications, candidates, and jobs
 * @example
 * {
 *   id: "com-1234-5678-90ab-cdef88889999",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   authorId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   parentId: null,
 *   entityType: "application",
 *   entityId: "app-1234-5678-90ab-cdef11112222",
 *   commentText: "Great candidate! Strong React skills. @rahul please schedule technical round.",
 *   mentions: "rahul@infosys.com",
 *   isImportant: true
 * }
 */
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  commentText: text('comment_text').notNull(),
  mentions: text('mentions'),
  isImportant: boolean('is_important').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * User-reported content for moderation
 * @example
 * {
 *   id: "rep-1234-5678-90ab-cdef99990000",
 *   reporterId: "550e8400-e29b-41d4-a716-446655440000",
 *   contentType: "job",
 *   contentId: "job-aaaa-bbbb-cccc-dddd11112222",
 *   reportType: "spam",
 *   description: "This job posting appears to be a scam - requesting money upfront",
 *   status: "pending",
 *   reviewedBy: null,
 *   resolutionNotes: null
 * }
 */
export const reportedContent = pgTable(
  'reported_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    contentId: uuid('content_id').notNull(),
    reportType: reportTypeEnum('report_type').notNull(),
    description: text('description'),
    status: reportStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => adminUsers.id),
    resolutionNotes: text('resolution_notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => [
    index('idx_reported_content_status').on(table.status),
    index('idx_reported_content_type').on(table.contentType),
  ],
);

/**
 * Customer support tickets
 * @example
 * {
 *   id: "tkt-1234-5678-90ab-cdef00001111",
 *   ticketNumber: "TKT-2025-00156",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   subject: "Unable to upload resume - file size error",
 *   category: "technical",
 *   priority: "high",
 *   status: "in_progress",
 *   assignedTo: "admin-xxxx-yyyy"
 * }
 */
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  priority: priorityEnum('priority').default('medium'),
  status: ticketStatusEnum('status').default('open'),
  assignedTo: uuid('assigned_to').references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

/**
 * Messages within support ticket conversations
 * @example
 * {
 *   id: "msg-1234-5678-90ab-cdef11112222",
 *   ticketId: "tkt-1234-5678-90ab-cdef00001111",
 *   senderType: "support",
 *   senderId: "admin-xxxx-yyyy",
 *   message: "Hi Priya, I've increased your file upload limit. Please try uploading your resume again. Let me know if you face any issues.",
 *   isInternalNote: false
 * }
 */
export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderType: senderTypeEnum('sender_type').notNull(),
  senderId: uuid('sender_id').notNull(),
  message: text('message').notNull(),
  isInternalNote: boolean('is_internal_note').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Dynamic filter options for job search filters, managed by super admin.
 * Each row represents one selectable option in a filter group.
 * @example
 * {
 *   id: "fo-1234-5678-90ab-cdef11112222",
 *   group: "job_type",
 *   label: "Full Time",
 *   value: "full_time",
 *   isActive: true,
 *   displayOrder: 1
 * }
 */
export const filterOptions = pgTable(
  'filter_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    group: varchar('group', { length: 50 }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    value: varchar('value', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_filter_options_group_value').on(table.group, table.value),
    index('idx_filter_options_group').on(table.group),
  ],
);
