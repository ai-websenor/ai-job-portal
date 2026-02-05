import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter, ResponseInterceptor } from '@ai-job-portal/common';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AdminService');

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Register multipart for file uploads (company logo, banner, etc.)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
      files: 1,
    },
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Admin Service API')
    .setDescription('AI Job Portal - Admin Dashboard & CMS')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('users', 'User management')
    .addTag('jobs', 'Job moderation')
    .addTag('admin-employers', 'Admin employer management (CRUD)')
    .addTag('companies', 'Company management')
    .addTag('teams', 'Team management')
    .addTag('company-media', 'Company media management')
    .addTag('career-pages', 'Career page management')
    .addTag('testimonials', 'Testimonials management')
    .addTag('content', 'CMS content management')
    .addTag('settings', 'System settings')
    .addTag('reports', 'Analytics and reports')
    .addTag('audit', 'Audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port, '0.0.0.0');
  logger.log(`Admin Service running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
