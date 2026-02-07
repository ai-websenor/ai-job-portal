import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { profiles } from './profiles';
import {
  fileTypeEnum,
  videoStatusEnum,
  moderationStatusEnum,
  privacySettingEnum,
  templateLevelEnum,
} from './enums';

/**
 * Uploaded resume files and builder-generated resumes
 * @example
 * {
 *   id: "res-1234-5678-90ab-cdef11112222",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   templateId: "tpl-aaaa-bbbb-cccc-dddd11112222",
 *   fileName: "Priya_Sharma_Resume_2025.pdf",
 *   filePath: "uploads/resumes/prof-1234/Priya_Sharma_Resume_2025.pdf",
 *   fileSize: 245678,
 *   fileType: "pdf",
 *   resumeName: "Software Engineer Resume",
 *   isDefault: true,
 *   isBuiltWithBuilder: false
 * }
 */
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => resumeTemplates.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  fileType: fileTypeEnum('file_type').notNull(),
  resumeName: varchar('resume_name', { length: 255 }),
  isDefault: boolean('is_default').default(false),
  isBuiltWithBuilder: boolean('is_built_with_builder').default(false),
  parsedContent: text('parsed_content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Resume builder templates with HTML/CSS
 * @example
 * {
 *   id: "tpl-aaaa-bbbb-cccc-dddd11112222",
 *   name: "Modern Professional",
 *   thumbnailUrl: "https://cdn.jobportal.in/templates/modern-pro-thumb.png",
 *   templateHtml: "<div class='resume'>...</div>",
 *   templateCss: ".resume { font-family: Inter; }",
 *   isPremium: true,
 *   isActive: true,
 *   displayOrder: 1
 * }
 */
export const resumeTemplates = pgTable('resume_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  templateType: varchar('template_type', { length: 100 }),
  templateLevel: templateLevelEnum('template_level'),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  templateHtml: text('template_html').notNull(),
  templateCss: text('template_css'),
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * AI-extracted structured data from resumes
 * @example
 * {
 *   id: "parsed-1234-5678-90ab-cdef22223333",
 *   resumeId: "res-1234-5678-90ab-cdef11112222",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   personalInfo: "{\"name\":\"Priya Sharma\",\"email\":\"priya@gmail.com\"}",
 *   workExperiences: "[{\"company\":\"Infosys\",\"title\":\"Senior SE\"}]",
 *   education: "[{\"institution\":\"BITS Pilani\",\"degree\":\"B.Tech\"}]",
 *   skills: "[\"React\",\"Node.js\",\"TypeScript\"]",
 *   confidenceScores: "{\"overall\":0.92,\"experience\":0.95}"
 * }
 */
export const parsedResumeData = pgTable('parsed_resume_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeId: uuid('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  personalInfo: text('personal_info'),
  workExperiences: text('work_experiences'),
  education: text('education'),
  skills: text('skills'),
  certifications: text('certifications'),
  projects: text('projects'),
  confidenceScores: text('confidence_scores'),
  rawText: text('raw_text'),
  structuredData: text('structured_data'), // Structured JSON from Hugging Face NER
  parsedAt: timestamp('parsed_at').notNull().defaultNow(),
});

/**
 * AI-powered resume quality and ATS compatibility scores
 * @example
 * {
 *   id: "analysis-1234-5678-90ab-cdef33334444",
 *   resumeId: "res-1234-5678-90ab-cdef11112222",
 *   qualityScore: 78.5,
 *   qualityBreakdown: "{\"formatting\":85,\"content\":75,\"keywords\":72}",
 *   atsScore: 82.0,
 *   atsIssues: "[\"Missing contact section\",\"Complex table layout\"]",
 *   suggestions: "[\"Add more action verbs\",\"Quantify achievements\"]",
 *   keywordMatches: "{\"React\":3,\"Node.js\":2,\"AWS\":1}"
 * }
 */
export const resumeAnalysis = pgTable('resume_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeId: uuid('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  qualityScore: numeric('quality_score', { precision: 5, scale: 2 }),
  qualityBreakdown: text('quality_breakdown'),
  atsScore: numeric('ats_score', { precision: 5, scale: 2 }),
  atsIssues: text('ats_issues'),
  suggestions: text('suggestions'),
  keywordMatches: text('keyword_matches'),
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
});

/**
 * Video resume uploads with processing and moderation status
 * @example
 * {
 *   id: "vr-1234-5678-90ab-cdef44445555",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   fileName: "priya-sharma-intro.mp4",
 *   originalUrl: "https://cdn.jobportal.in/videos/raw/priya-intro.mp4",
 *   processedUrls: "{\"720p\":\"url\",\"480p\":\"url\"}",
 *   thumbnailUrl: "https://cdn.jobportal.in/thumbs/priya-intro.jpg",
 *   durationSeconds: 120,
 *   fileSizeMb: 45.5,
 *   resolution: "1080p",
 *   format: "mp4",
 *   transcription: "Hi, I am Priya Sharma, a software engineer...",
 *   status: "processed",
 *   privacySetting: "employers_only",
 *   moderationStatus: "approved",
 *   viewCount: 45,
 *   isPrimary: true
 * }
 */
export const videoResumes = pgTable('video_resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  originalUrl: varchar('original_url', { length: 500 }).notNull(),
  processedUrls: text('processed_urls'),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  durationSeconds: integer('duration_seconds'),
  fileSizeMb: numeric('file_size_mb', { precision: 10, scale: 2 }),
  resolution: varchar('resolution', { length: 20 }),
  format: varchar('format', { length: 20 }),
  transcription: text('transcription'),
  status: videoStatusEnum('status').default('uploading'),
  privacySetting: privacySettingEnum('privacy_setting').default('employers_only'),
  moderationStatus: moderationStatusEnum('moderation_status').default('pending'),
  moderationNotes: text('moderation_notes'),
  viewCount: integer('view_count').default(0),
  totalWatchTime: integer('total_watch_time').default(0),
  averageWatchPercentage: numeric('average_watch_percentage', { precision: 5, scale: 2 }),
  isPrimary: boolean('is_primary').default(false),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  approvedAt: timestamp('approved_at'),
});

/**
 * Video resume view tracking and engagement metrics
 * @example
 * {
 *   id: "va-1234-5678-90ab-cdef55556666",
 *   videoResumeId: "vr-1234-5678-90ab-cdef44445555",
 *   viewerId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   watchDuration: 95,
 *   watchPercentage: 79.17,
 *   viewedAt: "2025-01-15T14:30:00Z"
 * }
 */
export const videoAnalytics = pgTable('video_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoResumeId: uuid('video_resume_id')
    .notNull()
    .references(() => videoResumes.id, { onDelete: 'cascade' }),
  viewerId: uuid('viewer_id').references(() => users.id, { onDelete: 'set null' }),
  watchDuration: integer('watch_duration'),
  watchPercentage: numeric('watch_percentage', { precision: 5, scale: 2 }),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
});
