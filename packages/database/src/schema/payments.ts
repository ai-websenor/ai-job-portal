import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, date, jsonb, index } from 'drizzle-orm/pg-core';
import { users, adminUsers } from './auth';
import { employers } from './employer';
import { billingCycleEnum, paymentStatusEnum, paymentMethodEnum, refundStatusEnum, discountTypeEnum } from './enums';

// Domain 7: Payments (9 tables)

// Subscription Plans
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  billingCycle: billingCycleEnum('billing_cycle').notNull(),
  features: text('features'),
  jobPostLimit: integer('job_post_limit'),
  resumeAccessLimit: integer('resume_access_limit'),
  featuredJobs: integer('featured_jobs').default(0),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Regions
export const regions = pgTable('regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  settings: text('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Regional Pricing
export const regionalPricing = pgTable('regional_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(),
  regionId: uuid('region_id').notNull().references(() => regions.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
});

// Discount Codes
export const discountCodes = pgTable('discount_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  minPurchaseAmount: numeric('min_purchase_amount', { precision: 10, scale: 2 }),
  maxDiscountAmount: numeric('max_discount_amount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').default(0),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  applicablePlans: text('applicable_plans'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull().references(() => adminUsers.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 50 }).notNull(),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  autoRenew: boolean('auto_renew').notNull().default(true),
  jobPostingLimit: integer('job_posting_limit').notNull().default(1),
  jobPostingUsed: integer('job_posting_used').notNull().default(0),
  featuredJobsLimit: integer('featured_jobs_limit').notNull().default(0),
  featuredJobsUsed: integer('featured_jobs_used').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id),
  resumeAccessLimit: integer('resume_access_limit').default(0),
  resumeAccessUsed: integer('resume_access_used').default(0),
  highlightedJobsLimit: integer('highlighted_jobs_limit').default(0),
  highlightedJobsUsed: integer('highlighted_jobs_used').default(0),
  isActive: boolean('is_active').default(true),
  canceledAt: timestamp('canceled_at'),
  paymentId: uuid('payment_id'),
});

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentGateway: varchar('payment_gateway', { length: 50 }).notNull(),
  transactionId: varchar('transaction_id', { length: 255 }),
  gatewayOrderId: varchar('gateway_order_id', { length: 255 }),
  gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  discountCodeId: uuid('discount_code_id').references(() => discountCodes.id),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0'),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0'),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }).default('0'),
  refundedAt: timestamp('refunded_at'),
  billingAddress: jsonb('billing_address'),
  emiTenure: integer('emi_tenure'),
  retryCount: integer('retry_count').default(0),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  billingName: varchar('billing_name', { length: 255 }),
  billingAddress: text('billing_address'),
  gstNumber: varchar('gst_number', { length: 20 }),
  hsnCode: varchar('hsn_code', { length: 20 }),
  cgstAmount: numeric('cgst_amount', { precision: 10, scale: 2 }).default('0'),
  sgstAmount: numeric('sgst_amount', { precision: 10, scale: 2 }).default('0'),
  igstAmount: numeric('igst_amount', { precision: 10, scale: 2 }).default('0'),
  lineItems: jsonb('line_items'),
  notes: text('notes'),
});

// Refunds
export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  status: refundStatusEnum('status').notNull().default('pending'),
  adminNotes: text('admin_notes'),
  processedBy: uuid('processed_by').references(() => adminUsers.id),
  gatewayRefundId: varchar('gateway_refund_id', { length: 255 }),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => [
  index('idx_refunds_payment').on(table.paymentId),
  index('idx_refunds_user').on(table.userId),
  index('idx_refunds_status').on(table.status),
]);

// Transaction History
export const transactionHistory = pgTable('transaction_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  status: paymentStatusEnum('status').notNull(),
  message: text('message'),
  gatewayResponse: text('gateway_response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
