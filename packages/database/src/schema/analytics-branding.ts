import { pgTable, uuid, varchar, text, timestamp, integer, boolean, decimal, date, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// Branding tier enum
export const brandingTierEnum = pgEnum('branding_tier', ['free', 'premium', 'enterprise']);

// Media type enum
export const mediaTypeEnum = pgEnum('media_type', ['photo', 'video']);

// Analytics Events table
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventName: varchar('event_name', { length: 100 }).notNull(),
  eventProperties: text('event_properties'), // JSON stringified
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  sessionId: varchar('session_id', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

// Metric Cache table
export const metricCache = pgTable('metric_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  metricValue: text('metric_value').notNull(), // JSON stringified
  period: varchar('period', { length: 50 }).notNull(),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Company Pages table (employer branding)
export const companyPages = pgTable('company_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  heroBannerUrl: varchar('hero_banner_url', { length: 500 }),
  tagline: varchar('tagline', { length: 255 }),
  about: text('about'),
  mission: text('mission'),
  culture: text('culture'),
  benefits: text('benefits'), // JSON stringified
  isPublished: boolean('is_published').default(false),
  brandingTier: brandingTierEnum('branding_tier').default('free'),
  customDomain: varchar('custom_domain', { length: 255 }),
  customColors: text('custom_colors'), // JSON stringified
  seoTitle: varchar('seo_title', { length: 100 }),
  seoDescription: varchar('seo_description', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Company Media table
export const companyMedia = pgTable('company_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  mediaType: mediaTypeEnum('media_type').notNull(),
  mediaUrl: varchar('media_url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  category: varchar('category', { length: 100 }),
  caption: text('caption'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Employee Testimonials table
export const employeeTestimonials = pgTable('employee_testimonials', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  photoUrl: varchar('photo_url', { length: 500 }),
  testimonial: text('testimonial').notNull(),
  videoUrl: varchar('video_url', { length: 500 }),
  isApproved: boolean('is_approved').default(false),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Regions table (multi-region support)
export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  settings: text('settings'), // JSON stringified
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Regional Pricing table
export const regionalPricing = pgTable('regional_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull(),
  regionId: uuid('region_id').notNull().references(() => regions.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
});
