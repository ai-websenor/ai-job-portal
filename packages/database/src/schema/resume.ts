import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { profiles } from './profiles';
import { fileTypeEnum, videoStatusEnum, moderationStatusEnum, privacySettingEnum, parsingStatusEnum } from './enums';

// Resumes
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
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

// Resume Templates
export const resumeTemplates = pgTable('resume_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  templateHtml: text('template_html').notNull(),
  templateCss: text('template_css'),
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Parsed Resume Data
export const parsedResumeData = pgTable('parsed_resume_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeId: uuid('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personalInfo: text('personal_info'),
  workExperiences: text('work_experiences'),
  education: text('education'),
  skills: text('skills'),
  certifications: text('certifications'),
  projects: text('projects'),
  confidenceScores: text('confidence_scores'),
  rawText: text('raw_text'),
  parsedAt: timestamp('parsed_at').notNull().defaultNow(),
});

// Resume Analysis
export const resumeAnalysis = pgTable('resume_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeId: uuid('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  qualityScore: numeric('quality_score', { precision: 5, scale: 2 }),
  qualityBreakdown: text('quality_breakdown'),
  atsScore: numeric('ats_score', { precision: 5, scale: 2 }),
  atsIssues: text('ats_issues'),
  suggestions: text('suggestions'),
  keywordMatches: text('keyword_matches'),
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
});

// Video Resumes
export const videoResumes = pgTable('video_resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// Video Analytics
export const videoAnalytics = pgTable('video_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoResumeId: uuid('video_resume_id').notNull().references(() => videoResumes.id, { onDelete: 'cascade' }),
  viewerId: uuid('viewer_id').references(() => users.id, { onDelete: 'set null' }),
  watchDuration: integer('watch_duration'),
  watchPercentage: numeric('watch_percentage', { precision: 5, scale: 2 }),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
});
