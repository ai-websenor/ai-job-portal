export declare const FILE_SIZE_LIMITS: {
  readonly MAX_FILE_SIZE: number;
  readonly MAX_RESUME_SIZE: number;
  readonly MAX_VIDEO_SIZE: number;
  readonly MAX_IMAGE_SIZE: number;
  readonly MAX_DOCUMENT_SIZE: number;
  readonly MAX_PROFILE_PHOTO_SIZE: number;
  readonly MAX_COMPANY_LOGO_SIZE: number;
};
export declare const DURATION_LIMITS: {
  readonly VIDEO_RESUME_MIN_DURATION: 30;
  readonly VIDEO_RESUME_MAX_DURATION: 180;
  readonly INTERVIEW_MIN_DURATION: 15;
  readonly INTERVIEW_MAX_DURATION: 240;
  readonly SESSION_TIMEOUT: 3600;
};
export declare const PAGINATION: {
  readonly DEFAULT_PAGE_SIZE: 20;
  readonly MAX_PAGE_SIZE: 100;
  readonly MIN_PAGE_SIZE: 5;
  readonly DEFAULT_PAGE: 1;
};
export declare const LIMITS: {
  readonly MAX_JOB_ALERTS: 10;
  readonly MAX_SAVED_SEARCHES: 20;
  readonly MAX_SAVED_JOBS: 500;
  readonly MAX_RESUMES: 10;
  readonly MAX_WORK_EXPERIENCES: 20;
  readonly MAX_EDUCATION_RECORDS: 10;
  readonly MAX_CERTIFICATIONS: 30;
  readonly MAX_SKILLS: 50;
  readonly MAX_TEAM_MEMBERS: 100;
  readonly MAX_TASKS_PER_USER: 200;
  readonly MAX_COMMENTS_PER_ENTITY: 500;
  readonly MAX_ATTACHMENTS: 5;
};
export declare const CACHE_TTL: {
  readonly SHORT: 300;
  readonly MEDIUM: 1800;
  readonly LONG: 3600;
  readonly VERY_LONG: 86400;
  readonly WEEK: 604800;
};
export declare const TOKEN_EXPIRY: {
  readonly JWT_ACCESS_TOKEN: '15m';
  readonly JWT_REFRESH_TOKEN: '30d';
  readonly PASSWORD_RESET_TOKEN: '1h';
  readonly EMAIL_VERIFICATION_TOKEN: '24h';
  readonly SESSION_TOKEN: '7d';
  readonly INVITATION_TOKEN: '7d';
  readonly TWO_FACTOR_TOKEN: '5m';
};
export declare const REGEX_PATTERNS: {
  readonly EMAIL: RegExp;
  readonly PHONE: RegExp;
  readonly MOBILE_IN: RegExp;
  readonly URL: RegExp;
  readonly SLUG: RegExp;
  readonly PASSWORD: RegExp;
  readonly GSTIN: RegExp;
  readonly PAN: RegExp;
  readonly PIN_CODE_IN: RegExp;
  readonly UUID: RegExp;
};
export declare const VALIDATION_RULES: {
  readonly MIN_PASSWORD_LENGTH: 8;
  readonly MAX_PASSWORD_LENGTH: 128;
  readonly MIN_USERNAME_LENGTH: 3;
  readonly MAX_USERNAME_LENGTH: 50;
  readonly MIN_NAME_LENGTH: 2;
  readonly MAX_NAME_LENGTH: 100;
  readonly MIN_DESCRIPTION_LENGTH: 10;
  readonly MAX_DESCRIPTION_LENGTH: 5000;
  readonly MIN_TITLE_LENGTH: 3;
  readonly MAX_TITLE_LENGTH: 255;
  readonly MIN_BIO_LENGTH: 10;
  readonly MAX_BIO_LENGTH: 1000;
  readonly MIN_SUMMARY_LENGTH: 50;
  readonly MAX_SUMMARY_LENGTH: 2000;
  readonly MIN_EXPERIENCE_YEARS: 0;
  readonly MAX_EXPERIENCE_YEARS: 50;
  readonly MIN_SALARY: 0;
  readonly MAX_SALARY: 100000000;
  readonly MIN_AGE: 16;
  readonly MAX_AGE: 100;
};
export declare const ALLOWED_FILE_TYPES: {
  readonly RESUME: readonly [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  readonly IMAGE: readonly ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  readonly VIDEO: readonly ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
  readonly DOCUMENT: readonly [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
};
export declare const NOTIFICATION_SETTINGS: {
  readonly MAX_RETRY_ATTEMPTS: 3;
  readonly RETRY_DELAY: 60000;
  readonly BATCH_SIZE: 100;
  readonly QUIET_HOURS_DEFAULT_START: '22:00';
  readonly QUIET_HOURS_DEFAULT_END: '08:00';
};
export declare const SEARCH_SETTINGS: {
  readonly MIN_MATCH_SCORE: 50;
  readonly RECOMMENDED_MATCH_SCORE: 75;
  readonly HIGH_MATCH_SCORE: 90;
  readonly MAX_RECOMMENDATIONS: 20;
  readonly MAX_SEARCH_RESULTS: 100;
  readonly FUZZY_SEARCH_THRESHOLD: 0.6;
};
export declare const SUBSCRIPTION_LIMITS: {
  readonly FREE: {
    readonly JOB_POSTS: 1;
    readonly RESUME_VIEWS: 5;
    readonly FEATURED_JOBS: 0;
    readonly TEAM_MEMBERS: 1;
    readonly VALIDITY_DAYS: 365;
  };
  readonly BASIC: {
    readonly JOB_POSTS: 10;
    readonly RESUME_VIEWS: 50;
    readonly FEATURED_JOBS: 1;
    readonly TEAM_MEMBERS: 3;
    readonly VALIDITY_DAYS: 30;
  };
  readonly PREMIUM: {
    readonly JOB_POSTS: 50;
    readonly RESUME_VIEWS: 500;
    readonly FEATURED_JOBS: 5;
    readonly TEAM_MEMBERS: 10;
    readonly VALIDITY_DAYS: 30;
  };
  readonly ENTERPRISE: {
    readonly JOB_POSTS: -1;
    readonly RESUME_VIEWS: -1;
    readonly FEATURED_JOBS: 20;
    readonly TEAM_MEMBERS: -1;
    readonly VALIDITY_DAYS: 365;
  };
};
export declare const RATE_LIMITS: {
  readonly API_DEFAULT: {
    readonly TTL: 60000;
    readonly LIMIT: 100;
  };
  readonly API_AUTH: {
    readonly TTL: 900000;
    readonly LIMIT: 5;
  };
  readonly API_UPLOAD: {
    readonly TTL: 3600000;
    readonly LIMIT: 20;
  };
  readonly API_SEARCH: {
    readonly TTL: 60000;
    readonly LIMIT: 30;
  };
};
export declare const SYSTEM_DEFAULTS: {
  readonly DEFAULT_TIMEZONE: 'UTC';
  readonly DEFAULT_CURRENCY: 'INR';
  readonly DEFAULT_LANGUAGE: 'en';
  readonly DEFAULT_COUNTRY: 'IN';
  readonly DEFAULT_DATE_FORMAT: 'YYYY-MM-DD';
  readonly DEFAULT_DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss';
  readonly DEFAULT_PROFILE_PHOTO: '/assets/images/default-avatar.png';
  readonly DEFAULT_COMPANY_LOGO: '/assets/images/default-company.png';
};
export declare const SCORING_WEIGHTS: {
  readonly SKILL_MATCH: 0.35;
  readonly EXPERIENCE_MATCH: 0.25;
  readonly LOCATION_MATCH: 0.15;
  readonly SALARY_MATCH: 0.1;
  readonly EDUCATION_MATCH: 0.1;
  readonly INDUSTRY_MATCH: 0.05;
};
export declare const ATS_SCORING: {
  readonly KEYWORD_DENSITY: 0.3;
  readonly FORMATTING: 0.2;
  readonly COMPLETENESS: 0.2;
  readonly CLARITY: 0.15;
  readonly QUANTIFICATION: 0.15;
  readonly MIN_PASSING_SCORE: 60;
  readonly GOOD_SCORE: 75;
  readonly EXCELLENT_SCORE: 90;
};
export declare const VIDEO_PROCESSING: {
  readonly SUPPORTED_FORMATS: readonly ['mp4', 'mov', 'avi', 'webm'];
  readonly OUTPUT_FORMAT: 'mp4';
  readonly RESOLUTIONS: readonly ['360p', '480p', '720p', '1080p'];
  readonly DEFAULT_RESOLUTION: '720p';
  readonly THUMBNAIL_COUNT: 3;
  readonly TRANSCODING_QUEUE_PRIORITY: 5;
};
export declare const EMAIL_TEMPLATE_IDS: {
  readonly WELCOME: 'welcome';
  readonly EMAIL_VERIFICATION: 'email_verification';
  readonly PASSWORD_RESET: 'password_reset';
  readonly JOB_ALERT: 'job_alert';
  readonly APPLICATION_RECEIVED: 'application_received';
  readonly APPLICATION_STATUS_UPDATE: 'application_status_update';
  readonly INTERVIEW_SCHEDULED: 'interview_scheduled';
  readonly INTERVIEW_REMINDER: 'interview_reminder';
  readonly OFFER_LETTER: 'offer_letter';
  readonly TEAM_INVITATION: 'team_invitation';
  readonly SUBSCRIPTION_EXPIRY: 'subscription_expiry';
};
export declare const WEBHOOK_EVENTS: {
  readonly USER_CREATED: 'user.created';
  readonly USER_UPDATED: 'user.updated';
  readonly JOB_CREATED: 'job.created';
  readonly JOB_UPDATED: 'job.updated';
  readonly APPLICATION_CREATED: 'application.created';
  readonly APPLICATION_UPDATED: 'application.updated';
  readonly INTERVIEW_SCHEDULED: 'interview.scheduled';
  readonly PAYMENT_SUCCESS: 'payment.success';
  readonly PAYMENT_FAILED: 'payment.failed';
  readonly SUBSCRIPTION_CREATED: 'subscription.created';
  readonly SUBSCRIPTION_EXPIRED: 'subscription.expired';
};
export declare const APP_CONSTANTS: {
  readonly DEFAULT_TIMEZONE: 'UTC';
  readonly DEFAULT_CURRENCY: 'INR';
  readonly DEFAULT_LANGUAGE: 'en';
  readonly DEFAULT_COUNTRY: 'IN';
  readonly DEFAULT_DATE_FORMAT: 'YYYY-MM-DD';
  readonly DEFAULT_DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss';
  readonly DEFAULT_PROFILE_PHOTO: '/assets/images/default-avatar.png';
  readonly DEFAULT_COMPANY_LOGO: '/assets/images/default-company.png';
  readonly MIN_MATCH_SCORE: 50;
  readonly RECOMMENDED_MATCH_SCORE: 75;
  readonly HIGH_MATCH_SCORE: 90;
  readonly MAX_RECOMMENDATIONS: 20;
  readonly MAX_SEARCH_RESULTS: 100;
  readonly FUZZY_SEARCH_THRESHOLD: 0.6;
  readonly MAX_RETRY_ATTEMPTS: 3;
  readonly RETRY_DELAY: 60000;
  readonly BATCH_SIZE: 100;
  readonly QUIET_HOURS_DEFAULT_START: '22:00';
  readonly QUIET_HOURS_DEFAULT_END: '08:00';
  readonly MIN_PASSWORD_LENGTH: 8;
  readonly MAX_PASSWORD_LENGTH: 128;
  readonly MIN_USERNAME_LENGTH: 3;
  readonly MAX_USERNAME_LENGTH: 50;
  readonly MIN_NAME_LENGTH: 2;
  readonly MAX_NAME_LENGTH: 100;
  readonly MIN_DESCRIPTION_LENGTH: 10;
  readonly MAX_DESCRIPTION_LENGTH: 5000;
  readonly MIN_TITLE_LENGTH: 3;
  readonly MAX_TITLE_LENGTH: 255;
  readonly MIN_BIO_LENGTH: 10;
  readonly MAX_BIO_LENGTH: 1000;
  readonly MIN_SUMMARY_LENGTH: 50;
  readonly MAX_SUMMARY_LENGTH: 2000;
  readonly MIN_EXPERIENCE_YEARS: 0;
  readonly MAX_EXPERIENCE_YEARS: 50;
  readonly MIN_SALARY: 0;
  readonly MAX_SALARY: 100000000;
  readonly MIN_AGE: 16;
  readonly MAX_AGE: 100;
  readonly JWT_ACCESS_TOKEN: '15m';
  readonly JWT_REFRESH_TOKEN: '30d';
  readonly PASSWORD_RESET_TOKEN: '1h';
  readonly EMAIL_VERIFICATION_TOKEN: '24h';
  readonly SESSION_TOKEN: '7d';
  readonly INVITATION_TOKEN: '7d';
  readonly TWO_FACTOR_TOKEN: '5m';
  readonly SHORT: 300;
  readonly MEDIUM: 1800;
  readonly LONG: 3600;
  readonly VERY_LONG: 86400;
  readonly WEEK: 604800;
  readonly MAX_JOB_ALERTS: 10;
  readonly MAX_SAVED_SEARCHES: 20;
  readonly MAX_SAVED_JOBS: 500;
  readonly MAX_RESUMES: 10;
  readonly MAX_WORK_EXPERIENCES: 20;
  readonly MAX_EDUCATION_RECORDS: 10;
  readonly MAX_CERTIFICATIONS: 30;
  readonly MAX_SKILLS: 50;
  readonly MAX_TEAM_MEMBERS: 100;
  readonly MAX_TASKS_PER_USER: 200;
  readonly MAX_COMMENTS_PER_ENTITY: 500;
  readonly MAX_ATTACHMENTS: 5;
  readonly DEFAULT_PAGE_SIZE: 20;
  readonly MAX_PAGE_SIZE: 100;
  readonly MIN_PAGE_SIZE: 5;
  readonly DEFAULT_PAGE: 1;
  readonly VIDEO_RESUME_MIN_DURATION: 30;
  readonly VIDEO_RESUME_MAX_DURATION: 180;
  readonly INTERVIEW_MIN_DURATION: 15;
  readonly INTERVIEW_MAX_DURATION: 240;
  readonly SESSION_TIMEOUT: 3600;
  readonly MAX_FILE_SIZE: number;
  readonly MAX_RESUME_SIZE: number;
  readonly MAX_VIDEO_SIZE: number;
  readonly MAX_IMAGE_SIZE: number;
  readonly MAX_DOCUMENT_SIZE: number;
  readonly MAX_PROFILE_PHOTO_SIZE: number;
  readonly MAX_COMPANY_LOGO_SIZE: number;
};
