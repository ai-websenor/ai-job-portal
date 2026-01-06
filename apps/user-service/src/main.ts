import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from '@ai-job-portal/common';
import multipart from '@fastify/multipart';
import { CustomLogger } from '@ai-job-portal/logger';
import { HttpExceptionFilter } from '@ai-job-portal/common';

async function bootstrap() {
  const logger = new CustomLogger();

  // Create NestJS application with Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 10485760, // 10MB
    }),
  );

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Register multipart plugin for file uploads
  await app.register(multipart as any, {
    limits: {
      fileSize: 10485760, // 10MB
      files: 1, // Max 1 file per request
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3002);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin', '*'),
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter - Centralized error handling with CustomLogger
  // Logs: error message, stack trace, request path, HTTP method, userId, email, role
  // Handles both HttpException and unknown errors
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Job Portal - User Service')
      .setDescription(
        'User Profile Management microservice for AI Job Portal - EPIC-02 Implementation',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('profile', 'User profile management - Create, read, update, delete profiles')
      .addTag('experience', 'Work experience management - Track professional history')
      .addTag('education', 'Education records - Academic qualifications and degrees')
      .addTag('skills', 'Skills management - Technical and soft skills with proficiency levels')
      .addTag('certifications', 'Professional certifications - Licenses and credentials')
      .addTag('resumes', 'Resume management - Upload, download, and manage resumes')
      .addTag('preferences', 'Job preferences - Search criteria and career preferences')
      .addTag('documents', 'Document management - ID proofs, certificates, portfolios')
      .addTag('analytics', 'Profile analytics - Views, engagement, and insights')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, '0.0.0.0');

  logger.success(`User Service is running on`, 'Bootstrap', { url: `http://localhost:${port}` });
  logger.info(`API Documentation`, 'Bootstrap', { url: `http://localhost:${port}/api/docs` });
  logger.info(`Environment`, 'Bootstrap', { env: nodeEnv });
}

bootstrap();
