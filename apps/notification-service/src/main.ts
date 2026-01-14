import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
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

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  logger.success(`Notification Service is running on`, 'Bootstrap', {
    url: `http://localhost:${port}`,
  });
  logger.info(`Health Check`, 'Bootstrap', { url: `http://localhost:${port}/api/v1/health` });
  logger.info(`Environment`, 'Bootstrap', { env: nodeEnv });
}

bootstrap();
