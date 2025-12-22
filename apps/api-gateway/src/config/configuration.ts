export default () => ({
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_job_portal',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Elasticsearch
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',

  // RabbitMQ
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',

  // Microservices endpoints
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  jobServiceUrl: process.env.JOB_SERVICE_URL || 'http://localhost:3003',
  applicationServiceUrl: process.env.APPLICATION_SERVICE_URL || 'http://localhost:3004',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
  messagingServiceUrl: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3008',
  adminServiceUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:3009',

  // AI Services endpoints (Python FastAPI)
  resumeParserUrl: process.env.RESUME_PARSER_URL || 'http://localhost:8001',
  jobRecommenderUrl: process.env.JOB_RECOMMENDER_URL || 'http://localhost:8002',
  qualityScorerUrl: process.env.QUALITY_SCORER_URL || 'http://localhost:8003',
  chatbotUrl: process.env.CHATBOT_URL || 'http://localhost:8004',
  jdGeneratorUrl: process.env.JD_GENERATOR_URL || 'http://localhost:8005',
  skillExtractorUrl: process.env.SKILL_EXTRACTOR_URL || 'http://localhost:8006',

  // Third-party services
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,

  // AWS S3
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsS3Bucket: process.env.AWS_S3_BUCKET,

  // Rate limiting
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
});
