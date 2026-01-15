export default () => ({
  app: {
    port: parseInt(process.env.APPLICATION_SERVICE_PORT || '3004', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_job_portal',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-here',
  },
});
