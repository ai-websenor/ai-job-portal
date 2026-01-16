import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@ai-job-portal/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('AI Job Portal - User & Profile Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('candidates', 'Candidate profile endpoints')
    .addTag('employers', 'Employer profile endpoints')
    .addTag('resumes', 'Resume management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`User Service running on http://localhost:${port}`);
}

bootstrap();
