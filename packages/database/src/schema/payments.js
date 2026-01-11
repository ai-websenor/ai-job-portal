'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.invoices =
  exports.transactionHistory =
  exports.subscriptions =
  exports.payments =
  exports.paymentMethodEnum =
  exports.paymentStatusEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)('payment_status', [
  'pending',
  'success',
  'failed',
  'refunded',
]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)('payment_method', [
  'credit_card',
  'debit_card',
  'upi',
  'netbanking',
  'wallet',
]);
exports.payments = (0, pg_core_1.pgTable)('payments', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  amount: (0, pg_core_1.decimal)('amount', { precision: 10, scale: 2 }).notNull(),
  currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('INR'),
  status: (0, exports.paymentStatusEnum)('status').notNull().default('pending'),
  paymentMethod: (0, exports.paymentMethodEnum)('payment_method'),
  paymentGateway: (0, pg_core_1.varchar)('payment_gateway', { length: 50 }).notNull(),
  transactionId: (0, pg_core_1.varchar)('transaction_id', { length: 255 }),
  gatewayOrderId: (0, pg_core_1.varchar)('gateway_order_id', { length: 255 }),
  gatewayPaymentId: (0, pg_core_1.varchar)('gateway_payment_id', { length: 255 }),
  invoiceNumber: (0, pg_core_1.varchar)('invoice_number', { length: 50 }),
  invoiceUrl: (0, pg_core_1.varchar)('invoice_url', { length: 500 }),
  metadata: (0, pg_core_1.text)('metadata'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.subscriptions = (0, pg_core_1.pgTable)('subscriptions', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  employerId: (0, pg_core_1.uuid)('employer_id')
    .notNull()
    .references(() => users_1.employers.id, { onDelete: 'cascade' }),
  plan: (0, pg_core_1.varchar)('plan', { length: 50 }).notNull(),
  billingCycle: (0, pg_core_1.varchar)('billing_cycle', { length: 20 }).notNull(),
  amount: (0, pg_core_1.decimal)('amount', { precision: 10, scale: 2 }).notNull(),
  currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('INR'),
  startDate: (0, pg_core_1.timestamp)('start_date').notNull(),
  endDate: (0, pg_core_1.timestamp)('end_date').notNull(),
  autoRenew: (0, pg_core_1.boolean)('auto_renew').notNull().default(true),
  jobPostingLimit: (0, pg_core_1.integer)('job_posting_limit').notNull().default(1),
  jobPostingUsed: (0, pg_core_1.integer)('job_posting_used').notNull().default(0),
  featuredJobsLimit: (0, pg_core_1.integer)('featured_jobs_limit').notNull().default(0),
  featuredJobsUsed: (0, pg_core_1.integer)('featured_jobs_used').notNull().default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.transactionHistory = (0, pg_core_1.pgTable)('transaction_history', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  paymentId: (0, pg_core_1.uuid)('payment_id')
    .notNull()
    .references(() => exports.payments.id, { onDelete: 'cascade' }),
  status: (0, exports.paymentStatusEnum)('status').notNull(),
  message: (0, pg_core_1.text)('message'),
  gatewayResponse: (0, pg_core_1.text)('gateway_response'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.invoices = (0, pg_core_1.pgTable)('invoices', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  paymentId: (0, pg_core_1.uuid)('payment_id')
    .notNull()
    .references(() => exports.payments.id, { onDelete: 'cascade' }),
  invoiceNumber: (0, pg_core_1.varchar)('invoice_number', { length: 50 }).notNull().unique(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id),
  amount: (0, pg_core_1.decimal)('amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: (0, pg_core_1.decimal)('tax_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  totalAmount: (0, pg_core_1.decimal)('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('INR'),
  invoiceUrl: (0, pg_core_1.varchar)('invoice_url', { length: 500 }),
  generatedAt: (0, pg_core_1.timestamp)('generated_at').notNull().defaultNow(),
});
//# sourceMappingURL=payments.js.map
