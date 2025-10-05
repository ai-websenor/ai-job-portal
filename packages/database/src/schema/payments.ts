import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum, decimal, boolean } from 'drizzle-orm/pg-core';
import { users, employers } from './users';

// Payment status enum
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'success',
  'failed',
  'refunded',
]);

// Payment method enum
export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card',
  'debit_card',
  'upi',
  'netbanking',
  'wallet',
]);

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentGateway: varchar('payment_gateway', { length: 50 }).notNull(), // 'razorpay', 'stripe'
  transactionId: varchar('transaction_id', { length: 255 }),
  gatewayOrderId: varchar('gateway_order_id', { length: 255 }),
  gatewayPaymentId: varchar('gateway_payment_id', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 50 }).notNull(), // 'free', 'basic', 'premium', 'enterprise'
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(), // 'monthly', 'quarterly', 'yearly'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
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
});

// Transaction History
export const transactionHistory = pgTable('transaction_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  status: paymentStatusEnum('status').notNull(),
  message: text('message'),
  gatewayResponse: text('gateway_response'), // JSON string
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
});
