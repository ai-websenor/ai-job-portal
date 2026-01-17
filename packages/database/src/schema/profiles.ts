import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import {
  genderEnum, visibilityEnum, proficiencyLevelEnum, skillCategoryEnum,
  educationLevelEnum, documentTypeEnum, jobSearchStatusEnum, workShiftEnum,
  employmentTypeEnum
} from './enums';

/**
 * Main candidate profile with personal & professional details
 * @example
 * {
 *   id: "prof-1234-5678-90ab-cdef12345678",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   firstName: "Priya",
 *   lastName: "Sharma",
 *   email: "priya.sharma@gmail.com",
 *   dateOfBirth: "1996-05-15",
 *   gender: "female",
 *   phone: "+919876543210",
 *   city: "Bangalore",
 *   state: "Karnataka",
 *   country: "India",
 *   pinCode: "560001",
 *   headline: "Senior Software Engineer | React & Node.js",
 *   professionalSummary: "5+ years building scalable web applications...",
 *   totalExperienceYears: 5.5,
 *   visibility: "public",
 *   completionPercentage: 85,
 *   resumeUrl: "https://cdn.jobportal.in/resumes/priya-sharma.pdf"
 * }
 */
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

/**
 * Candidate's employment history with company details
 * @example
 * {
 *   id: "exp-1111-2222-3333-444455556666",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   companyName: "Infosys Limited",
 *   jobTitle: "Senior Software Engineer",
 *   designation: "Technical Lead",
 *   employmentType: "full_time",
 *   location: "Bangalore, Karnataka",
 *   isCurrent: true,
 *   startDate: "2021-06-01",
 *   endDate: null,
 *   duration: "3 years 7 months",
 *   description: "Leading a team of 5 developers on enterprise React apps",
 *   achievements: "Reduced page load time by 40% through optimization",
 *   skillsUsed: "React, TypeScript, Node.js, AWS"
 * }
 */
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

/**
 * Academic qualifications and degrees
 * @example
 * {
 *   id: "edu-aaaa-bbbb-cccc-ddddeeee1111",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   level: "bachelors",
 *   institution: "BITS Pilani",
 *   degree: "B.Tech",
 *   fieldOfStudy: "Computer Science",
 *   startDate: "2014-08-01",
 *   endDate: "2018-05-31",
 *   grade: "8.5 CGPA",
 *   honors: "Dean's List 2017-18",
 *   relevantCoursework: "Data Structures, Algorithms, DBMS, OS"
 * }
 */
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

/**
 * Professional certifications and credentials
 * @example
 * {
 *   id: "cert-1234-5678-90ab-cdef00001111",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   name: "AWS Solutions Architect Associate",
 *   issuingOrganization: "Amazon Web Services",
 *   issueDate: "2023-03-15",
 *   expiryDate: "2026-03-15",
 *   credentialId: "AWS-SAA-C03-2023-XXXXX",
 *   credentialUrl: "https://www.credly.com/badges/xxxxx",
 *   isVerified: true
 * }
 */
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

/**
 * Master list of skills available in the system
 * @example
 * {
 *   id: "skill-react-0001-0000-000000000001",
 *   name: "React.js",
 *   category: "technical",
 *   isActive: true
 * }
 */
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  category: skillCategoryEnum('category').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Skills associated with a candidate profile
 * @example
 * {
 *   id: "ps-1234-5678-90ab-cdef11112222",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   skillId: "skill-react-0001-0000-000000000001",
 *   proficiencyLevel: "expert",
 *   yearsOfExperience: 4.5,
 *   displayOrder: 1
 * }
 */
export const profileSkills = pgTable('profile_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id),
  proficiencyLevel: proficiencyLevelEnum('proficiency_level').notNull(),
  yearsOfExperience: numeric('years_of_experience', { precision: 4, scale: 1 }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Master list of languages supported in the system
 * @example
 * {
 *   id: "lang-hindi-0001-0000-000000000001",
 *   code: "hi",
 *   name: "Hindi",
 *   nativeName: "हिन्दी",
 *   isActive: true
 * }
 */
export const languages = pgTable('languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  nativeName: varchar('native_name', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Languages known by a candidate with proficiency levels
 * @example
 * {
 *   id: "pl-1234-5678-90ab-cdef22223333",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   languageId: "lang-hindi-0001-0000-000000000001",
 *   proficiency: "native",
 *   isNative: true,
 *   canRead: true,
 *   canWrite: true,
 *   canSpeak: true
 * }
 */
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

/**
 * Portfolio projects showcasing candidate's work
 * @example
 * {
 *   id: "proj-1234-5678-90ab-cdef33334444",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   title: "E-commerce Platform",
 *   description: "Full-stack MERN e-commerce with payment integration",
 *   startDate: "2023-01-01",
 *   endDate: "2023-06-30",
 *   url: "https://github.com/priyasharma/ecommerce-app",
 *   technologies: ["React", "Node.js", "MongoDB", "Razorpay"],
 *   highlights: ["10K+ daily active users", "99.9% uptime"]
 * }
 */
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

/**
 * Candidate's job search preferences and expectations
 * @example
 * {
 *   id: "pref-1234-5678-90ab-cdef44445555",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   jobTypes: "full_time,contract",
 *   preferredLocations: "Bangalore,Hyderabad,Remote",
 *   preferredIndustries: "IT Services,Fintech,E-commerce",
 *   willingToRelocate: true,
 *   expectedSalaryMin: 1500000,
 *   expectedSalaryMax: 2500000,
 *   salaryCurrency: "INR",
 *   workShift: "day",
 *   jobSearchStatus: "actively_looking",
 *   noticePeriodDays: 60
 * }
 */
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

/**
 * Documents uploaded by candidates (resumes, certificates, etc.)
 * @example
 * {
 *   id: "doc-1234-5678-90ab-cdef55556666",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   documentType: "resume",
 *   fileName: "Priya_Sharma_Resume_2025.pdf",
 *   filePath: "uploads/resumes/prof-1234/Priya_Sharma_Resume_2025.pdf",
 *   fileSize: 245678
 * }
 */
export const profileDocuments = pgTable('profile_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  documentType: documentTypeEnum('document_type').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

/**
 * Tracks when employers view candidate profiles
 * @example
 * {
 *   id: "view-1234-5678-90ab-cdef66667777",
 *   profileId: "prof-1234-5678-90ab-cdef12345678",
 *   employerId: "emp-aaaa-bbbb-cccc-dddd11112222",
 *   viewedAt: "2025-01-15T14:30:00Z"
 * }
 */
export const profileViews = pgTable('profile_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
});

/**
 * User application settings and notification preferences
 * @example
 * {
 *   id: "upref-1234-5678-90ab-cdef77778888",
 *   userId: "550e8400-e29b-41d4-a716-446655440000",
 *   theme: "dark",
 *   language: "en",
 *   timezone: "Asia/Kolkata",
 *   emailNotifications: true,
 *   pushNotifications: true,
 *   smsNotifications: false
 * }
 */
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

