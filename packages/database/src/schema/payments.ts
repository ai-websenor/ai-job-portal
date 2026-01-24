import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, date, jsonb, index } from 'drizzle-orm/pg-core';
import { users, adminUsers } from './auth';
import { employers } from './employer';
import { billingCycleEnum, paymentStatusEnum, paymentMethodEnum, refundStatusEnum, discountTypeEnum } from './enums';

// Domain 7: Payments (9 tables)

/**
 * Subscription plan definitions with pricing and limits
 * @example
 * {
 *   id: "plan-1234-5678-90ab-cdef11112222",
 *   name: "Premium",
 *   slug: "premium",
 *   description: "Best for growing companies with high-volume hiring",
 *   price: 24999.00,
 *   currency: "INR",
 *   billingCycle: "monthly",
 *   features: "Unlimited job posts, Featured listings, Resume database access",
 *   jobPostLimit: 50,
 *   resumeAccessLimit: 500,
 *   featuredJobs: 10,
 *   isActive: true,
 *   sortOrder: 2
 * }
 */
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

/**
 * Geographic regions for localized pricing
 * @example
 * {
 *   id: "reg-1234-5678-90ab-cdef22223333",
 *   code: "IN",
 *   name: "India",
 *   currencyCode: "INR",
 *   taxRate: 18.00,
 *   isActive: true,
 *   settings: "{\"gst_enabled\":true,\"state_codes\":[\"KA\",\"MH\",\"DL\"]}"
 * }
 */
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

/**
 * Region-specific plan pricing
 * @example
 * {
 *   id: "rp-1234-5678-90ab-cdef33334444",
 *   planId: "plan-1234-5678-90ab-cdef11112222",
 *   regionId: "reg-1234-5678-90ab-cdef22223333",
 *   price: 24999.00,
 *   currency: "INR",
 *   effectiveFrom: "2025-01-01",
 *   effectiveTo: null
 * }
 */
export const regionalPricing = pgTable('regional_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(),
  regionId: uuid('region_id').notNull().references(() => regions.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
});

/**
 * Promotional discount codes and coupons
 * @example
 * {
 *   id: "disc-1234-5678-90ab-cdef44445555",
 *   code: "NEWYEAR25",
 *   description: "25% off on annual plans for new year 2025",
 *   discountType: "percentage",
 *   discountValue: 25.00,
 *   minPurchaseAmount: 10000.00,
 *   maxDiscountAmount: 10000.00,
 *   usageLimit: 1000,
 *   usageCount: 156,
 *   validFrom: "2025-01-01T00:00:00Z",
 *   validUntil: "2025-01-31T23:59:59Z",
 *   applicablePlans: "premium,enterprise",
 *   isActive: true,
 *   createdBy: "admin-xxxx-yyyy"
 * }
 */
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

/**
 * Active employer subscriptions with usage tracking
 * @example
 * {
 *   id: "sub-1234-5678-90ab-cdef55556666",
 *   employerId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   plan: "premium",
 *   billingCycle: "monthly",
 *   amount: 24999.00,
 *   currency: "INR",
 *   startDate: "2025-01-01T00:00:00Z",
 *   endDate: "2025-01-31T23:59:59Z",
 *   autoRenew: true,
 *   jobPostingLimit: 50,
 *   jobPostingUsed: 12,
 *   featuredJobsLimit: 10,
 *   featuredJobsUsed: 3,
 *   resumeAccessLimit: 500,
 *   resumeAccessUsed: 89,
 *   isActive: true
 * }
 */
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

/**
 * Payment transactions with gateway details
 * @example
 * {
 *   id: "pay-1234-5678-90ab-cdef66667777",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   amount: 24999.00,
 *   currency: "INR",
 *   status: "completed",
 *   paymentMethod: "upi",
 *   paymentGateway: "razorpay",
 *   transactionId: "txn_RP1234567890",
 *   gatewayOrderId: "order_RP1234567890",
 *   gatewayPaymentId: "pay_RP1234567890",
 *   invoiceNumber: "INV-2025-00156",
 *   subscriptionId: "sub-1234-5678-90ab-cdef55556666",
 *   discountCodeId: "disc-1234-5678-90ab-cdef44445555",
 *   discountAmount: 6249.75,
 *   taxAmount: 3374.82
 * }
 */
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

/**
 * GST-compliant invoices for payments
 * @example
 * {
 *   id: "inv-1234-5678-90ab-cdef77778888",
 *   paymentId: "pay-1234-5678-90ab-cdef66667777",
 *   invoiceNumber: "INV-2025-00156",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   amount: 21186.00,
 *   taxAmount: 3812.82,
 *   totalAmount: 24998.82,
 *   currency: "INR",
 *   invoiceUrl: "https://cdn.jobportal.in/invoices/INV-2025-00156.pdf",
 *   billingName: "Infosys Limited",
 *   billingAddress: "Electronics City, Bangalore 560100",
 *   gstNumber: "29AABCI1234A1Z5",
 *   hsnCode: "998314",
 *   cgstAmount: 1906.41,
 *   sgstAmount: 1906.41,
 *   igstAmount: 0.00
 * }
 */
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

/**
 * Refund requests and processing
 * @example
 * {
 *   id: "ref-1234-5678-90ab-cdef88889999",
 *   paymentId: "pay-1234-5678-90ab-cdef66667777",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   amount: 24999.00,
 *   reason: "Service not as expected, requested cancellation within 7 days",
 *   status: "approved",
 *   adminNotes: "Refund approved as per cancellation policy",
 *   processedBy: "admin-xxxx-yyyy",
 *   gatewayRefundId: "rfnd_RP1234567890",
 *   requestedAt: "2025-01-10T14:30:00Z",
 *   processedAt: "2025-01-11T10:00:00Z"
 * }
 */
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

/**
 * Payment status change audit trail
 * @example
 * {
 *   id: "txh-1234-5678-90ab-cdef99990000",
 *   paymentId: "pay-1234-5678-90ab-cdef66667777",
 *   status: "completed",
 *   message: "Payment captured successfully via UPI",
 *   gatewayResponse: "{\"status\":\"captured\",\"method\":\"upi\",\"vpa\":\"user@upi\"}"
 * }
 */
export const transactionHistory = pgTable('transaction_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  status: paymentStatusEnum('status').notNull(),
  message: text('message'),
  gatewayResponse: text('gateway_response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
