'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.regionalPricing =
  exports.regions =
  exports.employeeTestimonials =
  exports.companyMedia =
  exports.companyPages =
  exports.metricCache =
  exports.analyticsEvents =
  exports.mediaTypeEnum =
  exports.brandingTierEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.brandingTierEnum = (0, pg_core_1.pgEnum)('branding_tier', [
  'free',
  'premium',
  'enterprise',
]);
exports.mediaTypeEnum = (0, pg_core_1.pgEnum)('media_type', ['photo', 'video']);
exports.analyticsEvents = (0, pg_core_1.pgTable)('analytics_events', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id').references(() => users_1.users.id, {
    onDelete: 'set null',
  }),
  eventName: (0, pg_core_1.varchar)('event_name', { length: 100 }).notNull(),
  eventProperties: (0, pg_core_1.text)('event_properties'),
  timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
  sessionId: (0, pg_core_1.varchar)('session_id', { length: 100 }),
  ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
  userAgent: (0, pg_core_1.text)('user_agent'),
});
exports.metricCache = (0, pg_core_1.pgTable)('metric_cache', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  metricName: (0, pg_core_1.varchar)('metric_name', { length: 100 }).notNull(),
  metricValue: (0, pg_core_1.text)('metric_value').notNull(),
  period: (0, pg_core_1.varchar)('period', { length: 50 }).notNull(),
  calculatedAt: (0, pg_core_1.timestamp)('calculated_at').notNull().defaultNow(),
  expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
});
exports.companyPages = (0, pg_core_1.pgTable)('company_pages', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
  heroBannerUrl: (0, pg_core_1.varchar)('hero_banner_url', { length: 500 }),
  tagline: (0, pg_core_1.varchar)('tagline', { length: 255 }),
  about: (0, pg_core_1.text)('about'),
  mission: (0, pg_core_1.text)('mission'),
  culture: (0, pg_core_1.text)('culture'),
  benefits: (0, pg_core_1.text)('benefits'),
  isPublished: (0, pg_core_1.boolean)('is_published').default(false),
  brandingTier: (0, exports.brandingTierEnum)('branding_tier').default('free'),
  customDomain: (0, pg_core_1.varchar)('custom_domain', { length: 255 }),
  customColors: (0, pg_core_1.text)('custom_colors'),
  seoTitle: (0, pg_core_1.varchar)('seo_title', { length: 100 }),
  seoDescription: (0, pg_core_1.varchar)('seo_description', { length: 255 }),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.companyMedia = (0, pg_core_1.pgTable)('company_media', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  mediaType: (0, exports.mediaTypeEnum)('media_type').notNull(),
  mediaUrl: (0, pg_core_1.varchar)('media_url', { length: 500 }).notNull(),
  thumbnailUrl: (0, pg_core_1.varchar)('thumbnail_url', { length: 500 }),
  category: (0, pg_core_1.varchar)('category', { length: 100 }),
  caption: (0, pg_core_1.text)('caption'),
  displayOrder: (0, pg_core_1.integer)('display_order').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.employeeTestimonials = (0, pg_core_1.pgTable)('employee_testimonials', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  companyId: (0, pg_core_1.uuid)('company_id').notNull(),
  employeeName: (0, pg_core_1.varchar)('employee_name', { length: 255 }).notNull(),
  jobTitle: (0, pg_core_1.varchar)('job_title', { length: 255 }).notNull(),
  photoUrl: (0, pg_core_1.varchar)('photo_url', { length: 500 }),
  testimonial: (0, pg_core_1.text)('testimonial').notNull(),
  videoUrl: (0, pg_core_1.varchar)('video_url', { length: 500 }),
  isApproved: (0, pg_core_1.boolean)('is_approved').default(false),
  displayOrder: (0, pg_core_1.integer)('display_order').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.regions = (0, pg_core_1.pgTable)('regions', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  code: (0, pg_core_1.varchar)('code', { length: 10 }).notNull().unique(),
  name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
  currencyCode: (0, pg_core_1.varchar)('currency_code', { length: 3 }).notNull(),
  taxRate: (0, pg_core_1.decimal)('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: (0, pg_core_1.boolean)('is_active').default(true),
  settings: (0, pg_core_1.text)('settings'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.regionalPricing = (0, pg_core_1.pgTable)('regional_pricing', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  planId: (0, pg_core_1.uuid)('plan_id').notNull(),
  regionId: (0, pg_core_1.uuid)('region_id')
    .notNull()
    .references(() => exports.regions.id, { onDelete: 'cascade' }),
  price: (0, pg_core_1.decimal)('price', { precision: 10, scale: 2 }).notNull(),
  currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull(),
  effectiveFrom: (0, pg_core_1.date)('effective_from').notNull(),
  effectiveTo: (0, pg_core_1.date)('effective_to'),
});
//# sourceMappingURL=analytics-branding.js.map
