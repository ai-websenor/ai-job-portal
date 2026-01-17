import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { companySizeEnum, companyTypeEnum, verificationStatusEnum, subscriptionPlanEnum, brandingTierEnum, mediaTypeEnum, teamRoleEnum } from './enums';

/**
 * Company profiles with verification and branding info
 * @example
 * {
 *   id: "comp-1234-5678-90ab-cdef11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "Infosys Limited",
 *   slug: "infosys-limited",
 *   industry: "IT Services",
 *   companySize: "10000+",
 *   companyType: "public",
 *   yearEstablished: 1981,
 *   website: "https://www.infosys.com",
 *   description: "Global leader in next-generation digital services",
 *   headquarters: "Bangalore, Karnataka",
 *   employeeCount: 350000,
 *   linkedinUrl: "https://linkedin.com/company/infosys",
 *   gstNumber: "29AABCI1234A1Z5",
 *   isVerified: true,
 *   verificationStatus: "verified"
 * }
 */
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

/**
 * Employer accounts with subscription and verification status
 * @example
 * {
 *   id: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   isVerified: true,
 *   subscriptionPlan: "premium",
 *   subscriptionExpiresAt: "2025-12-31T23:59:59Z"
 * }
 */
export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id),
  isVerified: boolean('is_verified').notNull().default(false),
  subscriptionPlan: subscriptionPlanEnum('subscription_plan').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Team members collaborating on company hiring
 * @example
 * {
 *   id: "team-1234-5678-90ab-cdef33334444",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   userId: "user-9999-8888-7777-666655554444",
 *   role: "recruiter",
 *   permissions: "jobs:create,jobs:edit,applications:view",
 *   invitedBy: "550e8400-e29b-41d4-a716-446655440000",
 *   invitedAt: "2025-01-10T09:00:00Z",
 *   acceptedAt: "2025-01-10T10:30:00Z",
 *   isActive: true
 * }
 */
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

/**
 * Employer branding pages for company profile customization
 * @example
 * {
 *   id: "page-1234-5678-90ab-cdef44445555",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   slug: "infosys-careers",
 *   heroBannerUrl: "https://cdn.jobportal.in/banners/infosys-hero.jpg",
 *   tagline: "Navigate your next at Infosys",
 *   about: "Join 350,000+ employees driving digital transformation",
 *   culture: "Innovation, learning, and work-life balance",
 *   benefits: "Health insurance, flexible work, learning allowance",
 *   isPublished: true,
 *   brandingTier: "premium",
 *   seoTitle: "Careers at Infosys | Join Our Team",
 *   seoDescription: "Explore exciting career opportunities at Infosys"
 * }
 */
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

/**
 * Media assets for company branding (photos, videos)
 * @example
 * {
 *   id: "media-1234-5678-90ab-cdef55556666",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   mediaType: "video",
 *   mediaUrl: "https://cdn.jobportal.in/media/infosys-office-tour.mp4",
 *   thumbnailUrl: "https://cdn.jobportal.in/thumbs/infosys-office-tour.jpg",
 *   category: "office",
 *   caption: "Tour of our Bangalore campus",
 *   displayOrder: 1
 * }
 */
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

/**
 * Employee testimonials for company branding
 * @example
 * {
 *   id: "test-1234-5678-90ab-cdef66667777",
 *   companyId: "comp-1234-5678-90ab-cdef11112222",
 *   employeeName: "Rahul Verma",
 *   jobTitle: "Senior Software Engineer",
 *   photoUrl: "https://cdn.jobportal.in/testimonials/rahul-verma.jpg",
 *   testimonial: "Great work culture and learning opportunities. The mentorship program helped me grow rapidly.",
 *   videoUrl: "https://cdn.jobportal.in/videos/rahul-testimonial.mp4",
 *   isApproved: true,
 *   displayOrder: 1
 * }
 */
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
