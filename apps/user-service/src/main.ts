import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { HttpExceptionFilter, ResponseInterceptor } from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Register multipart for file uploads (225MB for video profiles)
  await app.register(multipart, {
    limits: {
      fileSize: 225 * 1024 * 1024, // 225MB max (video profile uploads)
      files: 1,
    },
  });

  app.useLogger(new CustomLogger());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('AI Job Portal - User & Profile Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('candidates', 'Candidate profile endpoints')
    .addTag('employers', 'Employer profile endpoints')
    .addTag('resumes', 'Resume management endpoints')
    .addTag('video-profile', 'Video profile upload and moderation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`User Service running on http://localhost:${port}`);
}

bootstrap();
