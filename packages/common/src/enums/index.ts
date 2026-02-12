/**
 * Application status enum matching database schema
 * Used for filtering and validation across application endpoints
 */
export enum ApplicationStatus {
  APPLIED = 'applied',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  REJECTED = 'rejected',
  HIRED = 'hired',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',
  WITHDRAWN = 'withdrawn',
}

/**
 * Array of all application status values for validation
 */
export const APPLICATION_STATUS_VALUES = Object.values(ApplicationStatus);
