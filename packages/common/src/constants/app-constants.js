"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONSTANTS = exports.WEBHOOK_EVENTS = exports.EMAIL_TEMPLATE_IDS = exports.VIDEO_PROCESSING = exports.ATS_SCORING = exports.SCORING_WEIGHTS = exports.SYSTEM_DEFAULTS = exports.RATE_LIMITS = exports.SUBSCRIPTION_LIMITS = exports.SEARCH_SETTINGS = exports.NOTIFICATION_SETTINGS = exports.ALLOWED_FILE_TYPES = exports.VALIDATION_RULES = exports.REGEX_PATTERNS = exports.TOKEN_EXPIRY = exports.CACHE_TTL = exports.LIMITS = exports.PAGINATION = exports.DURATION_LIMITS = exports.FILE_SIZE_LIMITS = void 0;
exports.FILE_SIZE_LIMITS = {
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    MAX_RESUME_SIZE: 10 * 1024 * 1024,
    MAX_VIDEO_SIZE: 500 * 1024 * 1024,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    MAX_DOCUMENT_SIZE: 25 * 1024 * 1024,
    MAX_PROFILE_PHOTO_SIZE: 2 * 1024 * 1024,
    MAX_COMPANY_LOGO_SIZE: 2 * 1024 * 1024,
};
exports.DURATION_LIMITS = {
    VIDEO_RESUME_MIN_DURATION: 30,
    VIDEO_RESUME_MAX_DURATION: 180,
    INTERVIEW_MIN_DURATION: 15,
    INTERVIEW_MAX_DURATION: 240,
    SESSION_TIMEOUT: 3600,
};
exports.PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MIN_PAGE_SIZE: 5,
    DEFAULT_PAGE: 1,
};
exports.LIMITS = {
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
};
exports.CACHE_TTL = {
    SHORT: 300,
    MEDIUM: 1800,
    LONG: 3600,
    VERY_LONG: 86400,
    WEEK: 604800,
};
exports.TOKEN_EXPIRY = {
    JWT_ACCESS_TOKEN: '15m',
    JWT_REFRESH_TOKEN: '30d',
    PASSWORD_RESET_TOKEN: '1h',
    EMAIL_VERIFICATION_TOKEN: '24h',
    SESSION_TOKEN: '7d',
    INVITATION_TOKEN: '7d',
    TWO_FACTOR_TOKEN: '5m',
};
exports.REGEX_PATTERNS = {
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
};
exports.VALIDATION_RULES = {
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
    MAX_SALARY: 100000000,
    MIN_AGE: 16,
    MAX_AGE: 100,
};
exports.ALLOWED_FILE_TYPES = {
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
};
exports.NOTIFICATION_SETTINGS = {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 60000,
    BATCH_SIZE: 100,
    QUIET_HOURS_DEFAULT_START: '22:00',
    QUIET_HOURS_DEFAULT_END: '08:00',
};
exports.SEARCH_SETTINGS = {
    MIN_MATCH_SCORE: 50,
    RECOMMENDED_MATCH_SCORE: 75,
    HIGH_MATCH_SCORE: 90,
    MAX_RECOMMENDATIONS: 20,
    MAX_SEARCH_RESULTS: 100,
    FUZZY_SEARCH_THRESHOLD: 0.6,
};
exports.SUBSCRIPTION_LIMITS = {
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
        JOB_POSTS: -1,
        RESUME_VIEWS: -1,
        FEATURED_JOBS: 20,
        TEAM_MEMBERS: -1,
        VALIDITY_DAYS: 365,
    },
};
exports.RATE_LIMITS = {
    API_DEFAULT: {
        TTL: 60000,
        LIMIT: 100,
    },
    API_AUTH: {
        TTL: 900000,
        LIMIT: 5,
    },
    API_UPLOAD: {
        TTL: 3600000,
        LIMIT: 20,
    },
    API_SEARCH: {
        TTL: 60000,
        LIMIT: 30,
    },
};
exports.SYSTEM_DEFAULTS = {
    DEFAULT_TIMEZONE: 'UTC',
    DEFAULT_CURRENCY: 'INR',
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_COUNTRY: 'IN',
    DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
    DEFAULT_DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    DEFAULT_PROFILE_PHOTO: '/assets/images/default-avatar.png',
    DEFAULT_COMPANY_LOGO: '/assets/images/default-company.png',
};
exports.SCORING_WEIGHTS = {
    SKILL_MATCH: 0.35,
    EXPERIENCE_MATCH: 0.25,
    LOCATION_MATCH: 0.15,
    SALARY_MATCH: 0.10,
    EDUCATION_MATCH: 0.10,
    INDUSTRY_MATCH: 0.05,
};
exports.ATS_SCORING = {
    KEYWORD_DENSITY: 0.30,
    FORMATTING: 0.20,
    COMPLETENESS: 0.20,
    CLARITY: 0.15,
    QUANTIFICATION: 0.15,
    MIN_PASSING_SCORE: 60,
    GOOD_SCORE: 75,
    EXCELLENT_SCORE: 90,
};
exports.VIDEO_PROCESSING = {
    SUPPORTED_FORMATS: ['mp4', 'mov', 'avi', 'webm'],
    OUTPUT_FORMAT: 'mp4',
    RESOLUTIONS: ['360p', '480p', '720p', '1080p'],
    DEFAULT_RESOLUTION: '720p',
    THUMBNAIL_COUNT: 3,
    TRANSCODING_QUEUE_PRIORITY: 5,
};
exports.EMAIL_TEMPLATE_IDS = {
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
};
exports.WEBHOOK_EVENTS = {
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
};
exports.APP_CONSTANTS = {
    ...exports.FILE_SIZE_LIMITS,
    ...exports.DURATION_LIMITS,
    ...exports.PAGINATION,
    ...exports.LIMITS,
    ...exports.CACHE_TTL,
    ...exports.TOKEN_EXPIRY,
    ...exports.VALIDATION_RULES,
    ...exports.NOTIFICATION_SETTINGS,
    ...exports.SEARCH_SETTINGS,
    ...exports.SYSTEM_DEFAULTS,
};
//# sourceMappingURL=app-constants.js.map