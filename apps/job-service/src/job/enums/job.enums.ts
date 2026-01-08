/**
 * Job Type Enum
 * Defines the employment type for a job posting
 * Must match database schema: job_type enum
 */
export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  GIG = 'gig',
  REMOTE = 'remote',
}

/**
 * Work Type Enum
 * Defines the nature of employment contract
 */
export enum WorkType {
  PERMANENT = 'permanent',
  CONTRACT = 'contract',
}

/**
 * Experience Level Enum
 * Defines the required experience level for a job
 * Must match database schema: experience_level enum
 */
export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

/**
 * Pay Rate Enum
 * Defines how salary is calculated/paid
 */
export enum PayRate {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}
