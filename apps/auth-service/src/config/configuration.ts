import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '2h',
    emailVerificationExpiration: process.env.JWT_EMAIL_VERIFICATION_EXPIRATION || '24h',
    passwordResetExpiration: process.env.JWT_PASSWORD_RESET_EXPIRATION || '1h',
  },

  // OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/social/google/callback',
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackUrl: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/social/linkedin/callback',
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // Email - Resend
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.EMAIL_FROM || 'noreply@aijobportal.com',
    fromName: process.env.EMAIL_FROM_NAME || 'AI Job Portal',
  },

  // Email - SMTP (Gmail fallback)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  // Frontend URLs
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    emailVerificationUrl: process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3000/verify-email',
    passwordResetUrl: process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    accountLockoutDuration: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION, 10) || 900000, // 15 minutes
    sessionExpiration: parseInt(process.env.SESSION_EXPIRATION, 10) || 86400000, // 24 hours
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10) || 3,
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // 2FA
  twoFactor: {
    appName: process.env.TWO_FACTOR_APP_NAME || 'AI Job Portal',
  },
}));
