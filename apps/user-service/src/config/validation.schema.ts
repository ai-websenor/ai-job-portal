import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App Configuration
  PORT: Joi.number().default(3002),
  GRPC_PORT: Joi.number().default(50052),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CORS_ORIGIN: Joi.string().default('*'),

  // Database Configuration
  DATABASE_URL: Joi.string().required(),

  // Redis Configuration
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // MinIO Configuration
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_ACCESS_KEY: Joi.string().default('minioadmin'),
  MINIO_SECRET_KEY: Joi.string().default('minioadmin123'),
  MINIO_USE_SSL: Joi.string().valid('true', 'false').default('false'),

  // Auth Service
  AUTH_SERVICE_GRPC_URL: Joi.string().default('localhost:50051'),

  // Upload Configuration
  MAX_FILE_SIZE: Joi.number().default(5242880), // 5MB
  MAX_IMAGE_SIZE: Joi.number().default(2097152), // 2MB
});
