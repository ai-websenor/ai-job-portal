import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// Admin role enum
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin', 'moderator', 'support']);

// Page status enum
export const pageStatusEnum = pgEnum('page_status', ['draft', 'published']);

// Priority enum
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);

// Ticket status enum
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);

// Billing cycle enum
export const billingCycleEnum = pgEnum('billing_cycle', ['one_time', 'monthly', 'quarterly', 'yearly']);

// Discount type enum
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);

// Data type enum
export const dataTypeEnum = pgEnum('data_type', ['string', 'number', 'boolean', 'json']);

// Admin Users table
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: adminRoleEnum('role').notNull(),
  permissions: text('permissions'), // JSON stringified
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Admin Activity Log table
export const adminActivityLog = pgTable('admin_activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminUserId: uuid('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: uuid('resource_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  changes: text('changes'), // JSON stringified
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// CMS Pages table
export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
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

// Job Categories table (enhanced for admin)
export const jobCategoriesAdmin: any = pgTable('job_categories_admin', {
  id: uuid('id').defaultRandom().primaryKey(),
  parentId: uuid('parent_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Subscription Plans table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  billingCycle: billingCycleEnum('billing_cycle').notNull(),
  features: text('features'), // JSON stringified
  jobPostLimit: integer('job_post_limit'),
  resumeAccessLimit: integer('resume_access_limit'),
  featuredJobs: integer('featured_jobs').default(0),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Discount Codes table
export const discountCodes = pgTable('discount_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minPurchaseAmount: decimal('min_purchase_amount', { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').default(0),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  applicablePlans: text('applicable_plans'), // JSON stringified
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull().references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Support Tickets table
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
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

// Sender type enum
export const senderTypeEnum = pgEnum('sender_type', ['user', 'admin']);

// Ticket Messages table
export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderType: senderTypeEnum('sender_type').notNull(),
  senderId: uuid('sender_id').notNull(),
  message: text('message').notNull(),
  isInternalNote: boolean('is_internal_note').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Platform Settings table
export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  dataType: dataTypeEnum('data_type').notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  updatedBy: uuid('updated_by').references(() => adminUsers.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
