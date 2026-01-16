import { pgTable, uuid, varchar, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

// Domain 3: Employer (3 tables)

export const employerProfiles = pgTable('employer_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companySlug: varchar('company_slug', { length: 255 }).notNull().unique(),
  companyLogo: text('company_logo'),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  foundedYear: integer('founded_year'),
  website: text('website'),
  description: text('description'),
  headquarters: varchar('headquarters', { length: 255 }),
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  facebookUrl: text('facebook_url'),
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('employer_profiles_user_id_idx').on(table.userId),
  index('employer_profiles_company_slug_idx').on(table.companySlug),
  index('employer_profiles_industry_idx').on(table.industry),
]);

export const employerTeamMembers = pgTable('employer_team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerProfileId: uuid('employer_profile_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  permissions: text('permissions'),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('employer_team_members_employer_id_idx').on(table.employerProfileId),
  index('employer_team_members_user_id_idx').on(table.userId),
]);

export const employerLocations = pgTable('employer_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerProfileId: uuid('employer_profile_id').notNull().references(() => employerProfiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  address: text('address'),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('employer_locations_employer_id_idx').on(table.employerProfileId),
]);
