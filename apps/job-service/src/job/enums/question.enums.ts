/**
 * Question Type Enum
 * Defines the types of questions that can be asked in job applications
 */
export enum QuestionType {
  TEXT = 'text',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  YES_NO = 'yes_no',
  RATING = 'rating',
  DATE = 'date',
  FILE_UPLOAD = 'file_upload',
}

/**
 * Work Location Options
 * Common options for work location preferences
 */
export enum WorkLocationOptions {
  REMOTE = 'Remote',
  HYBRID = 'Hybrid',
  ONSITE = 'Onsite',
}

/**
 * Yes/No Options
 * Standard yes/no responses
 */
export enum YesNoOptions {
  YES = 'Yes',
  NO = 'No',
}

/**
 * Relocation Options
 * Options for relocation willingness
 */
export enum RelocationOptions {
  YES = 'Yes',
  NO = 'No',
  MAYBE = 'Maybe',
  OPEN_TO_DISCUSSION = 'Open to discussion',
}

/**
 * Notice Period Options
 * Common notice period durations
 */
export enum NoticePeriodOptions {
  IMMEDIATE = 'Immediate',
  FIFTEEN_DAYS = '15 days',
  ONE_MONTH = '1 month',
  TWO_MONTHS = '2 months',
  THREE_MONTHS = '3 months',
  MORE_THAN_THREE_MONTHS = 'More than 3 months',
}

/**
 * Availability Options
 * When candidate can start
 */
export enum AvailabilityOptions {
  IMMEDIATE = 'Immediate',
  WITHIN_TWO_WEEKS = 'Within 2 weeks',
  WITHIN_ONE_MONTH = 'Within 1 month',
  WITHIN_TWO_MONTHS = 'Within 2 months',
  WITHIN_THREE_MONTHS = 'Within 3 months',
}

/**
 * Employment Status Options
 * Current employment status
 */
export enum EmploymentStatusOptions {
  EMPLOYED = 'Employed',
  UNEMPLOYED = 'Unemployed',
  STUDENT = 'Student',
  FREELANCER = 'Freelancer',
}

/**
 * Work Authorization Options
 * Work authorization status
 */
export enum WorkAuthorizationOptions {
  CITIZEN = 'Citizen',
  PERMANENT_RESIDENT = 'Permanent Resident',
  WORK_VISA = 'Work Visa',
  NEED_SPONSORSHIP = 'Need Sponsorship',
}

/**
 * Experience Level Options
 * Years of experience ranges
 */
export enum ExperienceLevelOptions {
  ZERO_TO_ONE = '0-1 years',
  ONE_TO_THREE = '1-3 years',
  THREE_TO_FIVE = '3-5 years',
  FIVE_TO_TEN = '5-10 years',
  MORE_THAN_TEN = '10+ years',
}

/**
 * Education Level Options
 * Highest education level
 */
export enum EducationLevelOptions {
  HIGH_SCHOOL = 'High School',
  ASSOCIATE = 'Associate Degree',
  BACHELOR = "Bachelor's Degree",
  MASTER = "Master's Degree",
  DOCTORATE = 'Doctorate',
  OTHER = 'Other',
}
