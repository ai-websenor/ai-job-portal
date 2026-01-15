import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from '@ai-job-portal/common';
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
    }),
  );

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3005);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  // CORS
  app.enableCors({
    origin: configService.get<string>('corsOrigin', '*'),
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
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Job Portal - Notification Service')
      .setDescription('Notification microservice for AI Job Portal (Email, SMS, WhatsApp, Push)')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health', 'Health check endpoints')
      .addTag('notifications', 'Notification endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.success(`Notification Service is running on`, 'Bootstrap', {
    url: `http://localhost:${port}`,
  });
  logger.info(`API Documentation`, 'Bootstrap', { url: `http://localhost:${port}/api/docs` });
  logger.info(`Health Check`, 'Bootstrap', { url: `http://localhost:${port}/api/v1/health` });
  logger.info(`Environment`, 'Bootstrap', { env: nodeEnv });
}

bootstrap();
