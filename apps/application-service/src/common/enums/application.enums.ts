/**
 * Application Status Enum
 * Represents all possible states of a job application
 * MUST match the enum values in the database schema
 */
export enum ApplicationStatus {
  APPLIED = 'applied',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  REJECTED = 'rejected',
  HIRED = 'hired',
  WITHDRAWN = 'withdrawn',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',
}

/**
 * Interview Type Enum
 * Represents the different types of interviews
 */
export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in_person',
}

/**
 * Interview Status Enum
 * Represents the status of a scheduled interview
 */
export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}
