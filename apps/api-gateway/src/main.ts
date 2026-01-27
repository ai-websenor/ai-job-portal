import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@ai-job-portal/common';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Register multipart support for file uploads
  await app.register(multipart, {
    attachFieldsToBody: false, // Don't parse, let downstream services handle it
  });

  // Serve static files (health dashboard)
  app.useStaticAssets({
    root: join(__dirname, '..', '..', '..', 'public'),
    prefix: '/',
  });

  app.setGlobalPrefix('api/v1', { exclude: ['/', '/health-dashboard.html'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  // Aggregated Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AI Job Portal API')
    .setDescription('Unified API Gateway for AI Job Portal Microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('jobs', 'Job listings')
    .addTag('applications', 'Job applications')
    .addServer('http://localhost:3000', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API Gateway running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`Health Dashboard: http://localhost:${port}/health-dashboard.html`);
}

bootstrap();
