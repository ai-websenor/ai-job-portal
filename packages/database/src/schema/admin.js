"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformSettings = exports.ticketMessages = exports.senderTypeEnum = exports.supportTickets = exports.discountCodes = exports.subscriptionPlans = exports.jobCategoriesAdmin = exports.cmsPages = exports.adminActivityLog = exports.adminUsers = exports.dataTypeEnum = exports.discountTypeEnum = exports.billingCycleEnum = exports.ticketStatusEnum = exports.priorityEnum = exports.pageStatusEnum = exports.adminRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.adminRoleEnum = (0, pg_core_1.pgEnum)('admin_role', ['super_admin', 'admin', 'moderator', 'support']);
exports.pageStatusEnum = (0, pg_core_1.pgEnum)('page_status', ['draft', 'published']);
exports.priorityEnum = (0, pg_core_1.pgEnum)('priority', ['low', 'medium', 'high', 'urgent']);
exports.ticketStatusEnum = (0, pg_core_1.pgEnum)('ticket_status', ['open', 'in_progress', 'resolved', 'closed']);
exports.billingCycleEnum = (0, pg_core_1.pgEnum)('billing_cycle', ['one_time', 'monthly', 'quarterly', 'yearly']);
exports.discountTypeEnum = (0, pg_core_1.pgEnum)('discount_type', ['percentage', 'fixed']);
exports.dataTypeEnum = (0, pg_core_1.pgEnum)('data_type', ['string', 'number', 'boolean', 'json']);
exports.adminUsers = (0, pg_core_1.pgTable)('admin_users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    role: (0, exports.adminRoleEnum)('role').notNull(),
    permissions: (0, pg_core_1.text)('permissions'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.adminActivityLog = (0, pg_core_1.pgTable)('admin_activity_log', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    adminUserId: (0, pg_core_1.uuid)('admin_user_id').notNull().references(() => exports.adminUsers.id, { onDelete: 'cascade' }),
    action: (0, pg_core_1.varchar)('action', { length: 255 }).notNull(),
    resourceType: (0, pg_core_1.varchar)('resource_type', { length: 100 }),
    resourceId: (0, pg_core_1.uuid)('resource_id'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    changes: (0, pg_core_1.text)('changes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.cmsPages = (0, pg_core_1.pgTable)('cms_pages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    metaTitle: (0, pg_core_1.varchar)('meta_title', { length: 255 }),
    metaDescription: (0, pg_core_1.text)('meta_description'),
    metaKeywords: (0, pg_core_1.text)('meta_keywords'),
    status: (0, exports.pageStatusEnum)('status').default('draft'),
    publishedAt: (0, pg_core_1.timestamp)('published_at'),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull().references(() => exports.adminUsers.id),
    updatedBy: (0, pg_core_1.uuid)('updated_by').references(() => exports.adminUsers.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.jobCategoriesAdmin = (0, pg_core_1.pgTable)('job_categories_admin', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    parentId: (0, pg_core_1.uuid)('parent_id'),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    iconUrl: (0, pg_core_1.varchar)('icon_url', { length: 500 }),
    imageUrl: (0, pg_core_1.varchar)('image_url', { length: 500 }),
    sortOrder: (0, pg_core_1.integer)('sort_order').default(0),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.subscriptionPlans = (0, pg_core_1.pgTable)('subscription_plans', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 100 }).notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    price: (0, pg_core_1.decimal)('price', { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).default('INR'),
    billingCycle: (0, exports.billingCycleEnum)('billing_cycle').notNull(),
    features: (0, pg_core_1.text)('features'),
    jobPostLimit: (0, pg_core_1.integer)('job_post_limit'),
    resumeAccessLimit: (0, pg_core_1.integer)('resume_access_limit'),
    featuredJobs: (0, pg_core_1.integer)('featured_jobs').default(0),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    sortOrder: (0, pg_core_1.integer)('sort_order').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.discountCodes = (0, pg_core_1.pgTable)('discount_codes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    discountType: (0, exports.discountTypeEnum)('discount_type').notNull(),
    discountValue: (0, pg_core_1.decimal)('discount_value', { precision: 10, scale: 2 }).notNull(),
    minPurchaseAmount: (0, pg_core_1.decimal)('min_purchase_amount', { precision: 10, scale: 2 }),
    maxDiscountAmount: (0, pg_core_1.decimal)('max_discount_amount', { precision: 10, scale: 2 }),
    usageLimit: (0, pg_core_1.integer)('usage_limit'),
    usageCount: (0, pg_core_1.integer)('usage_count').default(0),
    validFrom: (0, pg_core_1.timestamp)('valid_from').notNull(),
    validUntil: (0, pg_core_1.timestamp)('valid_until').notNull(),
    applicablePlans: (0, pg_core_1.text)('applicable_plans'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull().references(() => exports.adminUsers.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.supportTickets = (0, pg_core_1.pgTable)('support_tickets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    ticketNumber: (0, pg_core_1.varchar)('ticket_number', { length: 50 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id, { onDelete: 'cascade' }),
    subject: (0, pg_core_1.varchar)('subject', { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 100 }),
    priority: (0, exports.priorityEnum)('priority').default('medium'),
    status: (0, exports.ticketStatusEnum)('status').default('open'),
    assignedTo: (0, pg_core_1.uuid)('assigned_to').references(() => exports.adminUsers.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at'),
});
exports.senderTypeEnum = (0, pg_core_1.pgEnum)('sender_type', ['user', 'admin']);
exports.ticketMessages = (0, pg_core_1.pgTable)('ticket_messages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    ticketId: (0, pg_core_1.uuid)('ticket_id').notNull().references(() => exports.supportTickets.id, { onDelete: 'cascade' }),
    senderType: (0, exports.senderTypeEnum)('sender_type').notNull(),
    senderId: (0, pg_core_1.uuid)('sender_id').notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    isInternalNote: (0, pg_core_1.boolean)('is_internal_note').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.platformSettings = (0, pg_core_1.pgTable)('platform_settings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    key: (0, pg_core_1.varchar)('key', { length: 255 }).notNull().unique(),
    value: (0, pg_core_1.text)('value').notNull(),
    dataType: (0, exports.dataTypeEnum)('data_type').notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 100 }),
    description: (0, pg_core_1.text)('description'),
    isPublic: (0, pg_core_1.boolean)('is_public').default(false),
    updatedBy: (0, pg_core_1.uuid)('updated_by').references(() => exports.adminUsers.id),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
//# sourceMappingURL=admin.js.map