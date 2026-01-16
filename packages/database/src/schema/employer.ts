import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { companySizeEnum, companyTypeEnum, verificationStatusEnum, subscriptionPlanEnum, brandingTierEnum, mediaTypeEnum, teamRoleEnum } from './enums';

// Companies
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  companySize: companySizeEnum('company_size'),
  companyType: companyTypeEnum('company_type'),
  yearEstablished: integer('year_established'),
  website: varchar('website', { length: 500 }),
  description: text('description'),
  mission: text('mission'),
  culture: text('culture'),
  benefits: text('benefits'),
  logoUrl: varchar('logo_url', { length: 500 }),
  bannerUrl: varchar('banner_url', { length: 500 }),
  tagline: varchar('tagline', { length: 255 }),
  headquarters: varchar('headquarters', { length: 255 }),
  employeeCount: integer('employee_count'),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  twitterUrl: varchar('twitter_url', { length: 500 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  panNumber: varchar('pan_number', { length: 20 }),
  gstNumber: varchar('gst_number', { length: 20 }),
  cinNumber: varchar('cin_number', { length: 25 }),
  kycDocuments: jsonb('kyc_documents'),
  isVerified: boolean('is_verified').default(false),
  verificationStatus: verificationStatusEnum('verification_status').default('pending'),
  verificationDocuments: text('verification_documents'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('companies_slug_unique').on(table.slug),
]);

// Employers
export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyLogo: varchar('company_logo', { length: 500 }),
  website: varchar('website', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  description: text('description'),
  isVerified: boolean('is_verified').notNull().default(false),
  subscriptionPlan: subscriptionPlanEnum('subscription_plan').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Team Members
export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull(),
  permissions: text('permissions').array(),
  invitationStatus: varchar('invitation_status', { length: 20 }).default('pending'),
  invitedAt: timestamp('invited_at'),
  acceptedAt: timestamp('accepted_at'),
  lastActivityAt: timestamp('last_activity_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Team Members Collaboration
export const teamMembersCollaboration = pgTable('team_members_collaboration', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull(),
  permissions: text('permissions'),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Company Pages (Employer Branding)
export const companyPages = pgTable('company_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  heroBannerUrl: varchar('hero_banner_url', { length: 500 }),
  tagline: varchar('tagline', { length: 255 }),
  about: text('about'),
  mission: text('mission'),
  culture: text('culture'),
  benefits: text('benefits'),
  isPublished: boolean('is_published').default(false),
  brandingTier: brandingTierEnum('branding_tier').default('free'),
  customDomain: varchar('custom_domain', { length: 255 }),
  customColors: text('custom_colors'),
  seoTitle: varchar('seo_title', { length: 100 }),
  seoDescription: varchar('seo_description', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('company_pages_slug_unique').on(table.slug),
]);

// Company Media
export const companyMedia = pgTable('company_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  mediaType: mediaTypeEnum('media_type').notNull(),
  mediaUrl: varchar('media_url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  category: varchar('category', { length: 100 }),
  caption: text('caption'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Employee Testimonials
export const employeeTestimonials = pgTable('employee_testimonials', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  photoUrl: varchar('photo_url', { length: 500 }),
  testimonial: text('testimonial').notNull(),
  videoUrl: varchar('video_url', { length: 500 }),
  isApproved: boolean('is_approved').default(false),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
