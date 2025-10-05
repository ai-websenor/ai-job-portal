// ============================================
// FILE SIZE LIMITS
// ============================================

export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_RESUME_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_PROFILE_PHOTO_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_COMPANY_LOGO_SIZE: 2 * 1024 * 1024, // 2MB
} as const;

// ============================================
// DURATION LIMITS
// ============================================

export const DURATION_LIMITS = {
  VIDEO_RESUME_MIN_DURATION: 30, // 30 seconds
  VIDEO_RESUME_MAX_DURATION: 180, // 3 minutes
  INTERVIEW_MIN_DURATION: 15, // 15 minutes
  INTERVIEW_MAX_DURATION: 240, // 4 hours
  SESSION_TIMEOUT: 3600, // 1 hour
} as const;

// ============================================
// PAGINATION & LIMITS
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
  DEFAULT_PAGE: 1,
} as const;

export const LIMITS = {
  MAX_JOB_ALERTS: 10,
  MAX_SAVED_SEARCHES: 20,
  MAX_SAVED_JOBS: 500,
  MAX_RESUMES: 10,
  MAX_WORK_EXPERIENCES: 20,
  MAX_EDUCATION_RECORDS: 10,
  MAX_CERTIFICATIONS: 30,
  MAX_SKILLS: 50,
  MAX_TEAM_MEMBERS: 100,
  MAX_TASKS_PER_USER: 200,
  MAX_COMMENTS_PER_ENTITY: 500,
  MAX_ATTACHMENTS: 5,
} as const;

// ============================================
// CACHE TTL (Time To Live)
// ============================================

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// ============================================
// TOKEN EXPIRY
// ============================================

export const TOKEN_EXPIRY = {
  JWT_ACCESS_TOKEN: '15m',
  JWT_REFRESH_TOKEN: '30d',
  PASSWORD_RESET_TOKEN: '1h',
  EMAIL_VERIFICATION_TOKEN: '24h',
  SESSION_TOKEN: '7d',
  INVITATION_TOKEN: '7d',
  TWO_FACTOR_TOKEN: '5m',
} as const;

// ============================================
// REGEX PATTERNS
// ============================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  MOBILE_IN: /^[6-9]\d{9}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  PIN_CODE_IN: /^[1-9][0-9]{5}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 5000,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 255,
  MIN_BIO_LENGTH: 10,
  MAX_BIO_LENGTH: 1000,
  MIN_SUMMARY_LENGTH: 50,
  MAX_SUMMARY_LENGTH: 2000,
  MIN_EXPERIENCE_YEARS: 0,
  MAX_EXPERIENCE_YEARS: 50,
  MIN_SALARY: 0,
  MAX_SALARY: 100000000, // 10 Crores
  MIN_AGE: 16,
  MAX_AGE: 100,
} as const;

// ============================================
// ALLOWED FILE TYPES
// ============================================

export const ALLOWED_FILE_TYPES = {
  RESUME: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// ============================================
// NOTIFICATION SETTINGS
// ============================================

export const NOTIFICATION_SETTINGS = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 60000, // 1 minute
  BATCH_SIZE: 100,
  QUIET_HOURS_DEFAULT_START: '22:00',
  QUIET_HOURS_DEFAULT_END: '08:00',
} as const;

// ============================================
// SEARCH & RECOMMENDATION
// ============================================

export const SEARCH_SETTINGS = {
  MIN_MATCH_SCORE: 50,
  RECOMMENDED_MATCH_SCORE: 75,
  HIGH_MATCH_SCORE: 90,
  MAX_RECOMMENDATIONS: 20,
  MAX_SEARCH_RESULTS: 100,
  FUZZY_SEARCH_THRESHOLD: 0.6,
} as const;

// ============================================
// SUBSCRIPTION LIMITS
// ============================================

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    JOB_POSTS: 1,
    RESUME_VIEWS: 5,
    FEATURED_JOBS: 0,
    TEAM_MEMBERS: 1,
    VALIDITY_DAYS: 365,
  },
  BASIC: {
    JOB_POSTS: 10,
    RESUME_VIEWS: 50,
    FEATURED_JOBS: 1,
    TEAM_MEMBERS: 3,
    VALIDITY_DAYS: 30,
  },
  PREMIUM: {
    JOB_POSTS: 50,
    RESUME_VIEWS: 500,
    FEATURED_JOBS: 5,
    TEAM_MEMBERS: 10,
    VALIDITY_DAYS: 30,
  },
  ENTERPRISE: {
    JOB_POSTS: -1, // Unlimited
    RESUME_VIEWS: -1, // Unlimited
    FEATURED_JOBS: 20,
    TEAM_MEMBERS: -1, // Unlimited
    VALIDITY_DAYS: 365,
  },
} as const;

// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMITS = {
  API_DEFAULT: {
    TTL: 60000, // 1 minute
    LIMIT: 100,
  },
  API_AUTH: {
    TTL: 900000, // 15 minutes
    LIMIT: 5,
  },
  API_UPLOAD: {
    TTL: 3600000, // 1 hour
    LIMIT: 20,
  },
  API_SEARCH: {
    TTL: 60000, // 1 minute
    LIMIT: 30,
  },
} as const;

// ============================================
// SYSTEM DEFAULTS
// ============================================

export const SYSTEM_DEFAULTS = {
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_LANGUAGE: 'en',
  DEFAULT_COUNTRY: 'IN',
  DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
  DEFAULT_DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  DEFAULT_PROFILE_PHOTO: '/assets/images/default-avatar.png',
  DEFAULT_COMPANY_LOGO: '/assets/images/default-company.png',
} as const;

// ============================================
// SCORING WEIGHTS (for AI/ML)
// ============================================

export const SCORING_WEIGHTS = {
  SKILL_MATCH: 0.35,
  EXPERIENCE_MATCH: 0.25,
  LOCATION_MATCH: 0.15,
  SALARY_MATCH: 0.10,
  EDUCATION_MATCH: 0.10,
  INDUSTRY_MATCH: 0.05,
} as const;

// ============================================
// ATS SCORING CRITERIA
// ============================================

export const ATS_SCORING = {
  KEYWORD_DENSITY: 0.30,
  FORMATTING: 0.20,
  COMPLETENESS: 0.20,
  CLARITY: 0.15,
  QUANTIFICATION: 0.15,
  MIN_PASSING_SCORE: 60,
  GOOD_SCORE: 75,
  EXCELLENT_SCORE: 90,
} as const;

// ============================================
// VIDEO PROCESSING
// ============================================

export const VIDEO_PROCESSING = {
  SUPPORTED_FORMATS: ['mp4', 'mov', 'avi', 'webm'],
  OUTPUT_FORMAT: 'mp4',
  RESOLUTIONS: ['360p', '480p', '720p', '1080p'],
  DEFAULT_RESOLUTION: '720p',
  THUMBNAIL_COUNT: 3,
  TRANSCODING_QUEUE_PRIORITY: 5,
} as const;

// ============================================
// EMAIL TEMPLATES
// ============================================

export const EMAIL_TEMPLATE_IDS = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  JOB_ALERT: 'job_alert',
  APPLICATION_RECEIVED: 'application_received',
  APPLICATION_STATUS_UPDATE: 'application_status_update',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_REMINDER: 'interview_reminder',
  OFFER_LETTER: 'offer_letter',
  TEAM_INVITATION: 'team_invitation',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry',
} as const;

// ============================================
// WEBHOOK EVENTS
// ============================================

export const WEBHOOK_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  JOB_CREATED: 'job.created',
  JOB_UPDATED: 'job.updated',
  APPLICATION_CREATED: 'application.created',
  APPLICATION_UPDATED: 'application.updated',
  INTERVIEW_SCHEDULED: 'interview.scheduled',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
} as const;

// ============================================
// EXPORT ALL CONSTANTS
// ============================================

export const APP_CONSTANTS = {
  ...FILE_SIZE_LIMITS,
  ...DURATION_LIMITS,
  ...PAGINATION,
  ...LIMITS,
  ...CACHE_TTL,
  ...TOKEN_EXPIRY,
  ...VALIDATION_RULES,
  ...NOTIFICATION_SETTINGS,
  ...SEARCH_SETTINGS,
  ...SYSTEM_DEFAULTS,
} as const;
