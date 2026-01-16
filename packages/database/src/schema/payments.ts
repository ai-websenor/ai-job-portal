import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { employerProfiles } from './employer';
import { paymentStatusEnum, subscriptionStatusEnum, paymentProviderEnum } from './enums';

// Domain 7: Payments (4 tables)

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull().default('monthly'),
  features: text('features'),
  jobPostLimit: integer('job_post_limit'),
  featuredJobLimit: integer('featured_job_limit'),
  resumeAccessLimit: integer('resume_access_limit'),
  teamMemberLimit: integer('team_member_limit'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerProfileId: uuid('employer_profile_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('subscriptions_employer_id_idx').on(table.employerProfileId),
  index('subscriptions_status_idx').on(table.status),
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  provider: paymentProviderEnum('provider').notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }),
  providerOrderId: varchar('provider_order_id', { length: 255 }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  metadata: text('metadata'),
  paidAt: timestamp('paid_at'),
  failedAt: timestamp('failed_at'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('payments_user_id_idx').on(table.userId),
  index('payments_subscription_id_idx').on(table.subscriptionId),
  index('payments_status_idx').on(table.status),
  index('payments_provider_payment_id_idx').on(table.providerPaymentId),
]);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amount: integer('amount').notNull(),
  tax: integer('tax').default(0),
  totalAmount: integer('total_amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  billingName: varchar('billing_name', { length: 255 }),
  billingAddress: text('billing_address'),
  billingGstin: varchar('billing_gstin', { length: 20 }),
  invoiceUrl: text('invoice_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('invoices_payment_id_idx').on(table.paymentId),
  index('invoices_invoice_number_idx').on(table.invoiceNumber),
]);
