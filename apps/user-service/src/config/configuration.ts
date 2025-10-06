export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3002,
    grpcPort: parseInt(process.env.GRPC_PORT, 10) || 50052,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_job_portal',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    useSSL: process.env.MINIO_USE_SSL === 'true',
    buckets: {
      profiles: 'profiles',
      resumes: 'resumes',
      documents: 'documents',
      certificates: 'certificates',
    },
  },
  auth: {
    grpcUrl: process.env.AUTH_SERVICE_GRPC_URL || 'localhost:50051',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE, 10) || 2 * 1024 * 1024, // 2MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocumentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
});
