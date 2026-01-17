import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import {
  genderEnum, visibilityEnum, proficiencyLevelEnum, skillCategoryEnum,
  educationLevelEnum, documentTypeEnum, jobSearchStatusEnum, workShiftEnum,
  employmentTypeEnum
} from './enums';

// Profiles - Main candidate profile (consolidated from job_seekers)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  phone: varchar('phone', { length: 20 }),
  alternatePhone: varchar('alternate_phone', { length: 20 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  pinCode: varchar('pin_code', { length: 20 }),
  profilePhoto: varchar('profile_photo', { length: 500 }),
  headline: varchar('headline', { length: 255 }),
  professionalSummary: text('professional_summary'),
  totalExperienceYears: numeric('total_experience_years', { precision: 4, scale: 2 }),
  visibility: visibilityEnum('visibility').default('public'),
  isProfileComplete: boolean('is_profile_complete').default(false),
  completionPercentage: integer('completion_percentage').default(0),
  isPromoted: boolean('is_promoted').default(false),
  promotionExpiresAt: timestamp('promotion_expires_at'),
  profileBoostCount: integer('profile_boost_count').default(0),
  videoResumeUrl: varchar('video_resume_url', { length: 500 }),
  resumeUrl: varchar('resume_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('profiles_user_id_unique').on(table.userId),
  index('idx_profiles_promoted').on(table.isPromoted),
]);

// Work Experiences
export const workExperiences = pgTable('work_experiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  designation: varchar('designation', { length: 255 }).notNull(),
  employmentType: employmentTypeEnum('employment_type'),
  location: varchar('location', { length: 255 }),
  isCurrent: boolean('is_current').default(false),
  isFresher: boolean('is_fresher').default(false),
  startDate: date('start_date'),
  endDate: date('end_date'),
  duration: varchar('duration', { length: 100 }),
  description: text('description'),
  achievements: text('achievements'),
  skillsUsed: text('skills_used'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Education Records
export const educationRecords = pgTable('education_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  level: educationLevelEnum('level'),
  institution: varchar('institution', { length: 255 }).notNull(),
  degree: varchar('degree', { length: 255 }).notNull(),
  fieldOfStudy: varchar('field_of_study', { length: 255 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  currentlyStudying: boolean('currently_studying').default(false),
  grade: varchar('grade', { length: 50 }),
  honors: text('honors'),
  relevantCoursework: text('relevant_coursework'),
  description: text('description'),
  notes: text('notes'),
  certificateUrl: varchar('certificate_url', { length: 500 }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Certifications
export const certifications = pgTable('certifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  issuingOrganization: varchar('issuing_organization', { length: 255 }).notNull(),
  issueDate: date('issue_date').notNull(),
  expiryDate: date('expiry_date'),
  credentialId: varchar('credential_id', { length: 255 }),
  credentialUrl: varchar('credential_url', { length: 500 }),
  certificateFile: varchar('certificate_file', { length: 500 }),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Skills Master
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  category: skillCategoryEnum('category').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Profile Skills
export const profileSkills = pgTable('profile_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id),
  proficiencyLevel: proficiencyLevelEnum('proficiency_level').notNull(),
  yearsOfExperience: numeric('years_of_experience', { precision: 4, scale: 1 }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Languages Master
export const languages = pgTable('languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  nativeName: varchar('native_name', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Profile Languages
export const profileLanguages = pgTable('profile_languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  languageId: uuid('language_id').notNull().references(() => languages.id),
  proficiency: proficiencyLevelEnum('proficiency').notNull(),
  isNative: boolean('is_native').default(false),
  canRead: boolean('can_read').default(true),
  canWrite: boolean('can_write').default(true),
  canSpeak: boolean('can_speak').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Profile Projects
export const profileProjects = pgTable('profile_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  url: varchar('url', { length: 500 }),
  technologies: text('technologies').array(),
  highlights: text('highlights').array(),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job Preferences
export const jobPreferences = pgTable('job_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  jobTypes: text('job_types').notNull(),
  preferredLocations: text('preferred_locations').notNull(),
  preferredIndustries: text('preferred_industries'),
  willingToRelocate: boolean('willing_to_relocate').default(false),
  expectedSalary: numeric('expected_salary', { precision: 10, scale: 2 }),
  expectedSalaryMin: numeric('expected_salary_min', { precision: 10, scale: 2 }),
  expectedSalaryMax: numeric('expected_salary_max', { precision: 10, scale: 2 }),
  salaryCurrency: varchar('salary_currency', { length: 10 }).default('INR'),
  workShift: workShiftEnum('work_shift'),
  jobSearchStatus: jobSearchStatusEnum('job_search_status'),
  noticePeriodDays: integer('notice_period_days').notNull().default(30),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Profile Documents
export const profileDocuments = pgTable('profile_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  documentType: documentTypeEnum('document_type').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

// Profile Views
export const profileViews = pgTable('profile_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
});

// User Preferences (app settings)
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: varchar('theme', { length: 20 }).default('light'),
  language: varchar('language', { length: 10 }).default('en'),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata'),
  emailNotifications: boolean('email_notifications').default(true),
  pushNotifications: boolean('push_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

