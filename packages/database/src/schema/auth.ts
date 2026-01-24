import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { userRoleEnum, adminRoleEnum, socialProviderEnum } from './enums';

/**
 * Core user accounts for job seekers and employers
 * @example
 * {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   firstName: "Priya",
 *   lastName: "Sharma",
 *   email: "priya.sharma@gmail.com",
 *   password: "$2b$10$hashed...",
 *   mobile: "+919876543210",
 *   role: "candidate",
 *   isVerified: true,
 *   isMobileVerified: true,
 *   isActive: true,
 *   twoFactorEnabled: false,
 *   lastLoginAt: "2025-01-15T10:30:00Z",
 *   onboardingStep: 5,
 *   isOnboardingCompleted: true
 * }
 */
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

/**
 * Platform administrators with elevated permissions
 * @example
 * {
 *   id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   role: "super_admin",
 *   permissions: "users:read,users:write,jobs:moderate",
 *   isActive: true,
 *   lastLoginAt: "2025-01-16T09:00:00Z"
 * }
 */
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

/**
 * Active user login sessions for authentication
 * @example
 * {
 *   id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
 *   ipAddress: "103.15.67.89",
 *   expiresAt: "2025-01-22T10:30:00Z"
 * }
 */
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

/**
 * OAuth social login connections (Google, LinkedIn, etc.)
 * @example
 * {
 *   id: "c3d4e5f6-a7b8-9012-cdef-345678901234",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   provider: "google",
 *   providerId: "117234567890123456789",
 *   email: "priya.sharma@gmail.com",
 *   accessToken: "ya29.access_token_here...",
 *   refreshToken: "1//refresh_token_here...",
 *   expiresAt: "2025-02-15T10:30:00Z"
 * }
 */
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

/**
 * Email verification tokens for new account activation
 * @example
 * {
 *   id: "d4e5f6a7-b8c9-0123-def4-567890123456",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   token: "a7f3b2c1d4e5f6789012345678901234",
 *   expiresAt: "2025-01-16T10:30:00Z",
 *   verifiedAt: "2025-01-15T11:45:00Z"
 * }
 */
export const emailVerifications = pgTable('email_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Mobile OTP codes for phone verification
 * @example
 * {
 *   id: "e5f6a7b8-c9d0-1234-ef56-789012345678",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   otp: "847291",
 *   purpose: "mobile_verification",
 *   expiresAt: "2025-01-15T10:35:00Z",
 *   verifiedAt: "2025-01-15T10:33:00Z"
 * }
 */
export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  otp: varchar('otp', { length: 10 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Password reset tokens for forgot password flow
 * @example
 * {
 *   id: "f6a7b8c9-d0e1-2345-f678-901234567890",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   token: "reset_b8c9d0e1f2a3456789012345678901234",
 *   expiresAt: "2025-01-15T11:30:00Z",
 *   usedAt: "2025-01-15T10:45:00Z"
 * }
 */
export const passwordResets = pgTable('password_resets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
