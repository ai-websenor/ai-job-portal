// ============================================
// USER & AUTHENTICATION ENUMS
// ============================================

export enum UserRole {
  CANDIDATE= 'candidate',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
  TEAM_MEMBER = 'team_member',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  NOT_SPECIFIED = 'not_specified',
}

export enum SocialProvider {
  GOOGLE = 'google',
  LINKEDIN = 'linkedin',
}

// ============================================
// JOB & APPLICATION ENUMS
// ============================================

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
  GIG = 'gig',
  REMOTE = 'remote',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

export enum WorkMode {
  OFFICE = 'office',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  REJECTED = 'rejected',
  OFFERED = 'offered',
  HIRED = 'hired',
  WITHDRAWN = 'withdrawn',
}

export enum InterviewStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled',
  CANCELED = 'canceled',
  NO_SHOW = 'no_show',
}

export enum InterviewRound {
  SCREENING = 'screening',
  TECHNICAL = 'technical',
  HR = 'hr',
  MANAGERIAL = 'managerial',
  FINAL = 'final',
}

export enum InterviewMode {
  IN_PERSON = 'in_person',
  PHONE = 'phone',
  VIDEO = 'video',
}

// ============================================
// PROFILE ENUMS
// ============================================

export enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SEMI_PRIVATE = 'semi_private',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

export enum EducationLevel {
  HIGH_SCHOOL = 'high_school',
  BACHELORS = 'bachelors',
  MASTERS = 'masters',
  PHD = 'phd',
  DIPLOMA = 'diploma',
  CERTIFICATE = 'certificate',
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  INDUSTRY_SPECIFIC = 'industry_specific',
}

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum FileType {
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
}

export enum NoticePeriod {
  IMMEDIATE = 'immediate',
  FIFTEEN_DAYS = '15_days',
  ONE_MONTH = '1_month',
  TWO_MONTHS = '2_months',
  THREE_MONTHS = '3_months',
}

export enum JobSearchStatus {
  ACTIVELY_LOOKING = 'actively_looking',
  OPEN_TO_OPPORTUNITIES = 'open_to_opportunities',
  NOT_LOOKING = 'not_looking',
}

export enum DocumentType {
  RESUME = 'resume',
  COVER_LETTER = 'cover_letter',
  CERTIFICATE = 'certificate',
  ID_PROOF = 'id_proof',
  PORTFOLIO = 'portfolio',
  OTHER = 'other',
}

export enum WorkShift {
  DAY = 'day',
  NIGHT = 'night',
  ROTATIONAL = 'rotational',
  FLEXIBLE = 'flexible',
}

// ============================================
// COMPANY ENUMS
// ============================================

export enum CompanySize {
  TINY = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-500',
  ENTERPRISE = '500+',
}

export enum CompanyType {
  STARTUP = 'startup',
  SME = 'sme',
  MNC = 'mnc',
  GOVERNMENT = 'government',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum ShareChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  COPY_LINK = 'copy_link',
}

// ============================================
// NOTIFICATION ENUMS
// ============================================

export enum NotificationType {
  JOB_ALERT = 'job_alert',
  APPLICATION_UPDATE = 'application_update',
  INTERVIEW = 'interview',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
}

export enum NotificationFrequency {
  INSTANT = 'instant',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export enum QueueStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum QueuePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ============================================
// PAYMENT & SUBSCRIPTION ENUMS
// ============================================

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum BillingCycle {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  UPI = 'upi',
  NETBANKING = 'netbanking',
  WALLET = 'wallet',
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

// ============================================
// ADMIN ENUMS
// ============================================

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
}

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SenderType {
  USER = 'user',
  ADMIN = 'admin',
}

export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

// ============================================
// AI/ML ENUMS
// ============================================

export enum InteractionType {
  VIEW = 'view',
  APPLY = 'apply',
  SAVE = 'save',
  SHARE = 'share',
  NOT_INTERESTED = 'not_interested',
}

export enum UserAction {
  VIEWED = 'viewed',
  APPLIED = 'applied',
  SAVED = 'saved',
  IGNORED = 'ignored',
  NOT_INTERESTED = 'not_interested',
}

export enum DiversityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ParsingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================
// VIDEO & MEDIA ENUMS
// ============================================

export enum VideoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
}

export enum PrivacySetting {
  PUBLIC = 'public',
  EMPLOYERS_ONLY = 'employers_only',
  PRIVATE = 'private',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}

export enum Sender {
  USER = 'user',
  BOT = 'bot',
  AGENT = 'agent',
}

// ============================================
// BRANDING & ANALYTICS ENUMS
// ============================================

export enum BrandingTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

// ============================================
// TEAM COLLABORATION ENUMS
// ============================================

export enum TeamRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  HIRING_MANAGER = 'hiring_manager',
  INTERVIEWER = 'interviewer',
  VIEWER = 'viewer',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export enum RelatedToType {
  JOB = 'job',
  CANDIDATE = 'candidate',
  INTERVIEW = 'interview',
}

export enum EntityType {
  CANDIDATE = 'candidate',
  JOB = 'job',
  TASK = 'task',
  NOTE = 'note',
}

export enum InterviewRecommendation {
  STRONG_YES = 'strong_yes',
  YES = 'yes',
  MAYBE = 'maybe',
  NO = 'no',
  STRONG_NO = 'strong_no',
}

export enum NextSteps {
  NEXT_ROUND = 'next_round',
  REJECT = 'reject',
  HOLD = 'hold',
}
