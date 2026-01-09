import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import {users} from './users';

// Gender enum
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'not_specified']);

// Visibility enum
export const visibilityEnum = pgEnum('visibility', ['public', 'private', 'semi_private']);

// Employment type enum
export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
]);

// Education level enum
export const educationLevelEnum = pgEnum('education_level', [
  'high_school',
  'bachelors',
  'masters',
  'phd',
  'diploma',
  'certificate',
]);

// Skill category enum
export const skillCategoryEnum = pgEnum('skill_category', ['technical', 'soft']);

// Proficiency level enum
export const proficiencyLevelEnum = pgEnum('proficiency_level', [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

// File type enum
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'doc', 'docx']);

// Notice period enum
export const noticePeriodEnum = pgEnum('notice_period', [
  'immediate',
  '15_days',
  '1_month',
  '2_months',
  '3_months',
]);

// Job search status enum
export const jobSearchStatusEnum = pgEnum('job_search_status', [
  'actively_looking',
  'open_to_opportunities',
  'not_looking',
]);

// Document type enum
export const documentTypeEnum = pgEnum('document_type', [
  'resume',
  'cover_letter',
  'certificate',
  'id_proof',
  'portfolio',
  'other',
]);

// Work shift enum
export const workShiftEnum = pgEnum('work_shift', ['day', 'night', 'rotational', 'flexible']);

// Profiles table (enhanced job seeker profile)
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, {onDelete: 'cascade'})
    .unique(),
  firstName: varchar('first_name', {length: 100}),
  middleName: varchar('middle_name', {length: 100}),
  lastName: varchar('last_name', {length: 100}),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  phone: varchar('phone', {length: 20}),
  email: varchar('email', {length: 255}),
  alternatePhone: varchar('alternate_phone', {length: 20}),
  addressLine1: varchar('address_line1', {length: 255}),
  addressLine2: varchar('address_line2', {length: 255}),
  city: varchar('city', {length: 100}),
  state: varchar('state', {length: 100}),
  country: varchar('country', {length: 100}),
  pinCode: varchar('pin_code', {length: 20}),
  profilePhoto: varchar('profile_photo', {length: 500}),
  professionalSummary: text('professional_summary'),
  totalExperienceYears: decimal('total_experience_years', {precision: 4, scale: 2}),
  visibility: visibilityEnum('visibility').default('public'),
  isProfileComplete: boolean('is_profile_complete').default(false),
  completionPercentage: integer('completion_percentage').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Work Experiences table (enhanced)
export const workExperiences = pgTable('work_experiences', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  companyName: varchar('company_name', {length: 255}).notNull(),
  jobTitle: varchar('job_title', {length: 255}).notNull(),
  designation: varchar('designation', {length: 255}),
  employmentType: employmentTypeEnum('employment_type'),
  location: varchar('location', {length: 255}),
  isCurrent: boolean('is_current').default(false),
  duration: varchar('duration', {length: 100}), // e.g., "2 years", "6 months"
  isFresher: boolean('is_fresher').default(false),
  startDate: date('start_date'),
  endDate: date('end_date'),
  description: text('description'),
  achievements: text('achievements'),
  skillsUsed: text('skills_used'), // JSON stringified array
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Education table (enhanced)
export const educationRecords = pgTable('education_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  level: educationLevelEnum('level'),
  institution: varchar('institution', {length: 255}).notNull(),
  degree: varchar('degree', {length: 255}).notNull(),
  fieldOfStudy: varchar('field_of_study', {length: 255}),
  startDate: date('start_date'),
  endDate: date('end_date'),
  grade: varchar('grade', {length: 50}),
  honors: text('honors'),
  relevantCoursework: text('relevant_coursework'),
  currentlyStudying: boolean('currently_studying').default(false),
  certificateUrl: varchar('certificate_url', {length: 500}),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Skills master table
export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', {length: 100}).notNull().unique(),
  category: skillCategoryEnum('category'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Profile Skills (many-to-many relationship)
export const profileSkills = pgTable('profile_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, {onDelete: 'cascade'}),
  proficiencyLevel: proficiencyLevelEnum('proficiency_level'),
  yearsOfExperience: decimal('years_of_experience', {precision: 4, scale: 1}),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Certifications table
export const certifications = pgTable('certifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  name: varchar('name', {length: 255}).notNull(),
  issuingOrganization: varchar('issuing_organization', {length: 255}).notNull(),
  issueDate: date('issue_date').notNull(),
  expiryDate: date('expiry_date'),
  credentialId: varchar('credential_id', {length: 255}),
  credentialUrl: varchar('credential_url', {length: 500}),
  certificateFile: varchar('certificate_file', {length: 500}),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Resumes table (enhanced)
export const resumes = pgTable('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  fileName: varchar('file_name', {length: 255}).notNull(),
  filePath: varchar('file_path', {length: 500}).notNull(),
  fileSize: integer('file_size'),
  fileType: fileTypeEnum('file_type').notNull(),
  resumeName: varchar('resume_name', {length: 255}),
  isDefault: boolean('is_default').default(false),
  isBuiltWithBuilder: boolean('is_built_with_builder').default(false),
  templateId: uuid('template_id'),
  parsedContent: text('parsed_content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job Preferences table
export const jobPreferences = pgTable('job_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'})
    .unique(),
  jobTypes: text('job_types'), // JSON stringified array
  preferredLocations: text('preferred_locations'), // JSON stringified array
  willingToRelocate: boolean('willing_to_relocate').default(false),
  expectedSalaryMin: decimal('expected_salary_min', {precision: 10, scale: 2}),
  expectedSalaryMax: decimal('expected_salary_max', {precision: 10, scale: 2}),
  salaryCurrency: varchar('salary_currency', {length: 10}).default('INR'),
  expectedSalary: decimal('expected_salary', {precision: 10, scale: 2}),
  noticePeriod: noticePeriodEnum('notice_period'),
  preferredIndustries: text('preferred_industries'), // JSON stringified array
  workShift: workShiftEnum('work_shift'),
  jobSearchStatus: jobSearchStatusEnum('job_search_status'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Profile Documents table
export const profileDocuments = pgTable('profile_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  documentType: documentTypeEnum('document_type').notNull(),
  fileName: varchar('file_name', {length: 255}).notNull(),
  filePath: varchar('file_path', {length: 500}).notNull(),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

// Profile Views table
export const profileViews = pgTable('profile_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, {onDelete: 'cascade'}),
  employerId: uuid('employer_id')
    .notNull()
    .references(() => users.id, {onDelete: 'cascade'}),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
  source: varchar('source', {length: 100}),
});
