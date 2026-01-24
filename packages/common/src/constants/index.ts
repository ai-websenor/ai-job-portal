// JWT_CONSTANTS removed - use ConfigService to read JWT_ACCESS_EXPIRY and JWT_REFRESH_EXPIRY
// at runtime instead of reading process.env at module load time

export const CACHE_CONSTANTS = {
  USER_PREFIX: 'user:',
  SESSION_PREFIX: 'session:',
  OTP_PREFIX: 'otp:',
  RATE_LIMIT_PREFIX: 'rate:',
  DEFAULT_TTL: 300, // 5 minutes
  SESSION_TTL: 86400, // 24 hours
  OTP_TTL: 600, // 10 minutes
};

export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  RESUME_FOLDER: 'resumes',
  AVATAR_FOLDER: 'avatars',
  COMPANY_LOGO_FOLDER: 'company-logos',
  DOCUMENTS_FOLDER: 'documents',
};

export const RATE_LIMIT_CONSTANTS = {
  DEFAULT_TTL: 60,
  DEFAULT_LIMIT: 100,
  AUTH_TTL: 60,
  AUTH_LIMIT: 5,
};
