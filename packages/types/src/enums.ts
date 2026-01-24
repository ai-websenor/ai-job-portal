// User Roles
export enum UserRole {
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
  TEAM_MEMBER = 'team_member',
}

// Social Providers
export enum SocialProvider {
  GOOGLE = 'google',
  LINKEDIN = 'linkedin',
}

// Verification Types
export enum VerificationType {
  EMAIL = 'email',
  PHONE = 'phone',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = 'two_factor',
}

// Profile Visibility
export enum ProfileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  EMPLOYERS_ONLY = 'employers_only',
}

// Employment Types
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

// Work Modes
export enum WorkMode {
  REMOTE = 'remote',
  ONSITE = 'onsite',
  HYBRID = 'hybrid',
}

// Experience Levels
export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
}

// Job Status
export enum JobStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

// Application Status
export enum ApplicationStatus {
  PENDING = 'pending',
  SCREENING = 'screening',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
  OFFERED = 'offered',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

// Interview Status
export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
}

// Interview Types
export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in_person',
  TECHNICAL = 'technical',
  HR = 'hr',
  FINAL = 'final',
}

// Notification Types
export enum NotificationType {
  APPLICATION = 'application',
  INTERVIEW = 'interview',
  JOB = 'job',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

// Notification Channels
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Subscription Status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

// Company Sizes
export enum CompanySize {
  STARTUP = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-1000',
  ENTERPRISE = '1000+',
}

// Skill Proficiency
export enum SkillProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}
