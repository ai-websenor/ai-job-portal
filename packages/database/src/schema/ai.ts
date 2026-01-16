import { pgTable, uuid, varchar, text, timestamp, numeric, boolean, index } from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { candidateProfiles } from './profiles';
import { matchStatusEnum, recommendationTypeEnum } from './enums';

// Domain 10: AI/ML (6 tables)

export const candidateJobMatches = pgTable('candidate_job_matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  matchScore: numeric('match_score', { precision: 5, scale: 2 }).notNull(),
  skillMatchScore: numeric('skill_match_score', { precision: 5, scale: 2 }),
  experienceMatchScore: numeric('experience_match_score', { precision: 5, scale: 2 }),
  locationMatchScore: numeric('location_match_score', { precision: 5, scale: 2 }),
  salaryMatchScore: numeric('salary_match_score', { precision: 5, scale: 2 }),
  status: matchStatusEnum('status').notNull().default('pending'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_job_matches_candidate_id_idx').on(table.candidateProfileId),
  index('candidate_job_matches_job_id_idx').on(table.jobId),
  index('candidate_job_matches_score_idx').on(table.matchScore),
]);

export const resumeParsingResults = pgTable('resume_parsing_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  resumeUrl: text('resume_url').notNull(),
  parsedData: text('parsed_data'),
  extractedSkills: text('extracted_skills'),
  extractedExperience: text('extracted_experience'),
  extractedEducation: text('extracted_education'),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('resume_parsing_results_candidate_id_idx').on(table.candidateProfileId),
]);

export const skillRecommendations = pgTable('skill_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull(),
  reason: text('reason'),
  relevanceScore: numeric('relevance_score', { precision: 5, scale: 2 }),
  isAccepted: boolean('is_accepted'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('skill_recommendations_candidate_id_idx').on(table.candidateProfileId),
]);

export const jobRecommendations = pgTable('job_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  score: numeric('score', { precision: 5, scale: 2 }).notNull(),
  reason: text('reason'),
  isViewed: boolean('is_viewed').notNull().default(false),
  isClicked: boolean('is_clicked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('job_recommendations_candidate_id_idx').on(table.candidateProfileId),
  index('job_recommendations_job_id_idx').on(table.jobId),
]);

export const candidateRecommendations = pgTable('candidate_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  candidateProfileId: uuid('candidate_profile_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
  score: numeric('score', { precision: 5, scale: 2 }).notNull(),
  reason: text('reason'),
  isViewed: boolean('is_viewed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('candidate_recommendations_job_id_idx').on(table.jobId),
  index('candidate_recommendations_candidate_id_idx').on(table.candidateProfileId),
]);

export const aiModelLogs = pgTable('ai_model_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }),
  inputData: text('input_data'),
  outputData: text('output_data'),
  processingTimeMs: numeric('processing_time_ms'),
  status: varchar('status', { length: 50 }).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('ai_model_logs_model_name_idx').on(table.modelName),
  index('ai_model_logs_created_at_idx').on(table.createdAt),
]);
