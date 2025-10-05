import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  CORS_ORIGIN: Joi.string().default('*'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  JWT_EMAIL_VERIFICATION_EXPIRATION: Joi.string().default('24h'),
  JWT_PASSWORD_RESET_EXPIRATION: Joi.string().default('1h'),

  // OAuth - Google
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),

  // OAuth - LinkedIn
  LINKEDIN_CLIENT_ID: Joi.string().optional(),
  LINKEDIN_CLIENT_SECRET: Joi.string().optional(),
  LINKEDIN_CALLBACK_URL: Joi.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),

  // Email - Resend
  RESEND_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().default('noreply@aijobportal.com'),
  EMAIL_FROM_NAME: Joi.string().default('AI Job Portal'),

  // Email - SMTP (Gmail)
  SMTP_HOST: Joi.string().default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),

  // Frontend
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  EMAIL_VERIFICATION_URL: Joi.string().default('http://localhost:3000/verify-email'),
  PASSWORD_RESET_URL: Joi.string().default('http://localhost:3000/reset-password'),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(10),
  MAX_LOGIN_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCKOUT_DURATION: Joi.number().default(900000),
  SESSION_EXPIRATION: Joi.number().default(86400000),
  MAX_CONCURRENT_SESSIONS: Joi.number().default(3),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // 2FA
  TWO_FACTOR_APP_NAME: Joi.string().default('AI Job Portal'),
});
