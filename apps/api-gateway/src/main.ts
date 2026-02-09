import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@ai-job-portal/common';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Register multipart support for file uploads
  await app.register(multipart, {
    attachFieldsToBody: false, // Don't parse, let downstream services handle it
  });

  // Register JWT authentication hook (Fastify-compatible)
  const jwtService = app.get(JwtService);
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (request, _reply) => {
      const authHeader = request.headers.authorization;
      logger.log(`🚀 Auth Hook - ${request.method} ${request.url}`);
      logger.log(`🔐 Authorization header: ${authHeader ? 'Present' : 'Missing'}`);

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = jwtService.verify(token);
          (request as any).user = payload;
          logger.log(`✅ JWT verified, user: ${JSON.stringify(payload)}`);
        } catch (error: any) {
          logger.error(`❌ JWT verification failed: ${error?.message || error}`);
        }
      } else {
        logger.warn('⚠️  No Bearer token found');
      }
    });

  // Serve static files (health dashboard)
  app.useStaticAssets({
    root: join(__dirname, '..', '..', '..', 'public'),
    prefix: '/',
  });

  app.setGlobalPrefix('api/v1', { exclude: ['/', '/health-dashboard.html'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration - allow all origins for now (frontend still in local development)
  const corsOrigins = process.env.CORS_ORIGINS?.split(',');
  app.enableCors({
    origin: corsOrigins || '*',
    credentials: true,
  });

  // Swagger documentation with dynamic server URL
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const configBuilder = new DocumentBuilder()
    .setTitle('AI Job Portal API')
    .setDescription('Unified API Gateway for AI Job Portal Microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('jobs', 'Job listings')
    .addTag('applications', 'Job applications');

  // Add appropriate server based on environment
  if (isProduction) {
    configBuilder.addServer(apiBaseUrl, 'Production');
  } else {
    configBuilder.addServer(apiBaseUrl, 'Development');
  }

  const config = configBuilder.build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway running on ${apiBaseUrl}`);
  logger.log(`Swagger docs: ${apiBaseUrl}/api/docs`);
  logger.log(`Health Dashboard: ${apiBaseUrl}/health-dashboard.html`);
  logger.log(`Environment: ${isProduction ? 'production' : 'development'}`);
}

bootstrap();
// CI/CD: auto-deploy to ECS v1
