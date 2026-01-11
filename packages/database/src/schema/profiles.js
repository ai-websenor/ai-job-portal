'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.profileViews =
  exports.profileDocuments =
  exports.jobPreferences =
  exports.resumes =
  exports.certifications =
  exports.profileSkills =
  exports.skills =
  exports.educationRecords =
  exports.workExperiences =
  exports.profiles =
  exports.workShiftEnum =
  exports.documentTypeEnum =
  exports.jobSearchStatusEnum =
  exports.noticePeriodEnum =
  exports.fileTypeEnum =
  exports.proficiencyLevelEnum =
  exports.skillCategoryEnum =
  exports.educationLevelEnum =
  exports.employmentTypeEnum =
  exports.visibilityEnum =
  exports.genderEnum =
    void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const users_1 = require('./users');
exports.genderEnum = (0, pg_core_1.pgEnum)('gender', ['male', 'female', 'other', 'not_specified']);
exports.visibilityEnum = (0, pg_core_1.pgEnum)('visibility', ['public', 'private', 'semi_private']);
exports.employmentTypeEnum = (0, pg_core_1.pgEnum)('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
]);
exports.educationLevelEnum = (0, pg_core_1.pgEnum)('education_level', [
  'high_school',
  'bachelors',
  'masters',
  'phd',
  'diploma',
  'certificate',
]);
exports.skillCategoryEnum = (0, pg_core_1.pgEnum)('skill_category', [
  'technical',
  'soft',
  'language',
  'industry_specific',
]);
exports.proficiencyLevelEnum = (0, pg_core_1.pgEnum)('proficiency_level', [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);
exports.fileTypeEnum = (0, pg_core_1.pgEnum)('file_type', ['pdf', 'doc', 'docx']);
exports.noticePeriodEnum = (0, pg_core_1.pgEnum)('notice_period', [
  'immediate',
  '15_days',
  '1_month',
  '2_months',
  '3_months',
]);
exports.jobSearchStatusEnum = (0, pg_core_1.pgEnum)('job_search_status', [
  'actively_looking',
  'open_to_opportunities',
  'not_looking',
]);
exports.documentTypeEnum = (0, pg_core_1.pgEnum)('document_type', [
  'resume',
  'cover_letter',
  'certificate',
  'id_proof',
  'portfolio',
  'other',
]);
exports.workShiftEnum = (0, pg_core_1.pgEnum)('work_shift', [
  'day',
  'night',
  'rotational',
  'flexible',
]);
exports.profiles = (0, pg_core_1.pgTable)('profiles', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  userId: (0, pg_core_1.uuid)('user_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' })
    .unique(),
  firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
  middleName: (0, pg_core_1.varchar)('middle_name', { length: 100 }),
  lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
  dateOfBirth: (0, pg_core_1.date)('date_of_birth'),
  gender: (0, exports.genderEnum)('gender'),
  phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
  alternatePhone: (0, pg_core_1.varchar)('alternate_phone', { length: 20 }),
  addressLine1: (0, pg_core_1.varchar)('address_line1', { length: 255 }),
  addressLine2: (0, pg_core_1.varchar)('address_line2', { length: 255 }),
  city: (0, pg_core_1.varchar)('city', { length: 100 }),
  state: (0, pg_core_1.varchar)('state', { length: 100 }),
  country: (0, pg_core_1.varchar)('country', { length: 100 }),
  pinCode: (0, pg_core_1.varchar)('pin_code', { length: 20 }),
  profilePhoto: (0, pg_core_1.varchar)('profile_photo', { length: 500 }),
  professionalSummary: (0, pg_core_1.text)('professional_summary'),
  totalExperienceYears: (0, pg_core_1.decimal)('total_experience_years', {
    precision: 4,
    scale: 2,
  }),
  visibility: (0, exports.visibilityEnum)('visibility').default('public'),
  isProfileComplete: (0, pg_core_1.boolean)('is_profile_complete').default(false),
  completionPercentage: (0, pg_core_1.integer)('completion_percentage').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.workExperiences = (0, pg_core_1.pgTable)('work_experiences', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }).notNull(),
  jobTitle: (0, pg_core_1.varchar)('job_title', { length: 255 }).notNull(),
  designation: (0, pg_core_1.varchar)('designation', { length: 255 }),
  employmentType: (0, exports.employmentTypeEnum)('employment_type'),
  location: (0, pg_core_1.varchar)('location', { length: 255 }),
  isCurrent: (0, pg_core_1.boolean)('is_current').default(false),
  duration: (0, pg_core_1.varchar)('duration', { length: 100 }),
  isFresher: (0, pg_core_1.boolean)('is_fresher').default(false),
  startDate: (0, pg_core_1.date)('start_date'),
  endDate: (0, pg_core_1.date)('end_date'),
  description: (0, pg_core_1.text)('description'),
  achievements: (0, pg_core_1.text)('achievements'),
  skillsUsed: (0, pg_core_1.text)('skills_used'),
  displayOrder: (0, pg_core_1.integer)('display_order').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.educationRecords = (0, pg_core_1.pgTable)('education_records', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  level: (0, exports.educationLevelEnum)('level'),
  institution: (0, pg_core_1.varchar)('institution', { length: 255 }).notNull(),
  degree: (0, pg_core_1.varchar)('degree', { length: 255 }).notNull(),
  fieldOfStudy: (0, pg_core_1.varchar)('field_of_study', { length: 255 }),
  startDate: (0, pg_core_1.date)('start_date'),
  endDate: (0, pg_core_1.date)('end_date'),
  grade: (0, pg_core_1.varchar)('grade', { length: 50 }),
  honors: (0, pg_core_1.text)('honors'),
  relevantCoursework: (0, pg_core_1.text)('relevant_coursework'),
  certificateUrl: (0, pg_core_1.varchar)('certificate_url', { length: 500 }),
  displayOrder: (0, pg_core_1.integer)('display_order').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.skills = (0, pg_core_1.pgTable)('skills', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull().unique(),
  category: (0, exports.skillCategoryEnum)('category'),
  isActive: (0, pg_core_1.boolean)('is_active').default(true),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.profileSkills = (0, pg_core_1.pgTable)('profile_skills', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  skillId: (0, pg_core_1.uuid)('skill_id')
    .notNull()
    .references(() => exports.skills.id, { onDelete: 'cascade' }),
  proficiencyLevel: (0, exports.proficiencyLevelEnum)('proficiency_level'),
  yearsOfExperience: (0, pg_core_1.decimal)('years_of_experience', { precision: 4, scale: 1 }),
  displayOrder: (0, pg_core_1.integer)('display_order').default(0),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.certifications = (0, pg_core_1.pgTable)('certifications', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
  issuingOrganization: (0, pg_core_1.varchar)('issuing_organization', { length: 255 }).notNull(),
  issueDate: (0, pg_core_1.date)('issue_date').notNull(),
  expiryDate: (0, pg_core_1.date)('expiry_date'),
  credentialId: (0, pg_core_1.varchar)('credential_id', { length: 255 }),
  credentialUrl: (0, pg_core_1.varchar)('credential_url', { length: 500 }),
  certificateFile: (0, pg_core_1.varchar)('certificate_file', { length: 500 }),
  isVerified: (0, pg_core_1.boolean)('is_verified').default(false),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.resumes = (0, pg_core_1.pgTable)('resumes', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
  filePath: (0, pg_core_1.varchar)('file_path', { length: 500 }).notNull(),
  fileSize: (0, pg_core_1.integer)('file_size'),
  fileType: (0, exports.fileTypeEnum)('file_type').notNull(),
  resumeName: (0, pg_core_1.varchar)('resume_name', { length: 255 }),
  isDefault: (0, pg_core_1.boolean)('is_default').default(false),
  isBuiltWithBuilder: (0, pg_core_1.boolean)('is_built_with_builder').default(false),
  templateId: (0, pg_core_1.uuid)('template_id'),
  parsedContent: (0, pg_core_1.text)('parsed_content'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.jobPreferences = (0, pg_core_1.pgTable)('job_preferences', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' })
    .unique(),
  jobTypes: (0, pg_core_1.text)('job_types'),
  preferredLocations: (0, pg_core_1.text)('preferred_locations'),
  willingToRelocate: (0, pg_core_1.boolean)('willing_to_relocate').default(false),
  expectedSalaryMin: (0, pg_core_1.decimal)('expected_salary_min', { precision: 10, scale: 2 }),
  expectedSalaryMax: (0, pg_core_1.decimal)('expected_salary_max', { precision: 10, scale: 2 }),
  salaryCurrency: (0, pg_core_1.varchar)('salary_currency', { length: 10 }).default('INR'),
  noticePeriod: (0, exports.noticePeriodEnum)('notice_period'),
  preferredIndustries: (0, pg_core_1.text)('preferred_industries'),
  workShift: (0, exports.workShiftEnum)('work_shift'),
  jobSearchStatus: (0, exports.jobSearchStatusEnum)('job_search_status'),
  createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.profileDocuments = (0, pg_core_1.pgTable)('profile_documents', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  documentType: (0, exports.documentTypeEnum)('document_type').notNull(),
  fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
  filePath: (0, pg_core_1.varchar)('file_path', { length: 500 }).notNull(),
  fileSize: (0, pg_core_1.integer)('file_size'),
  uploadedAt: (0, pg_core_1.timestamp)('uploaded_at').notNull().defaultNow(),
});
exports.profileViews = (0, pg_core_1.pgTable)('profile_views', {
  id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
  profileId: (0, pg_core_1.uuid)('profile_id')
    .notNull()
    .references(() => exports.profiles.id, { onDelete: 'cascade' }),
  employerId: (0, pg_core_1.uuid)('employer_id')
    .notNull()
    .references(() => users_1.users.id, { onDelete: 'cascade' }),
  viewedAt: (0, pg_core_1.timestamp)('viewed_at').notNull().defaultNow(),
  source: (0, pg_core_1.varchar)('source', { length: 100 }),
});
//# sourceMappingURL=profiles.js.map
