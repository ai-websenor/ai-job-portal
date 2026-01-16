import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { userRoleEnum, adminRoleEnum, socialProviderEnum } from './enums';

// Users - Core user table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  mobile: varchar('mobile', { length: 20 }).notNull(),
  role: userRoleEnum('role').notNull().default('candidate'),
  isVerified: boolean('is_verified').notNull().default(false),
  isMobileVerified: boolean('is_mobile_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  resumeDetails: jsonb('resume_details'),
  onboardingStep: integer('onboarding_step').default(0),
  isOnboardingCompleted: boolean('is_onboarding_completed').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('users_email_unique').on(table.email),
]);

// Admin Users
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: adminRoleEnum('role').notNull(),
  permissions: text('permissions'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
]);

// Social Logins
export const socialLogins = pgTable('social_logins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: socialProviderEnum('provider').notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('social_logins_user_id_idx').on(table.userId),
]);

// Email Verifications
export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// OTPs
export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  otp: varchar('otp', { length: 10 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Password Resets
export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
