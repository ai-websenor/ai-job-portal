import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthService');

  // Create NestJS application with Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Security
  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === 'production',
  });

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

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Job Portal - Authentication Service')
      .setDescription('Authentication and Authorization microservice for AI Job Portal')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('user', 'User management endpoints')
      .addTag('session', 'Session management endpoints')
      .addTag('2fa', 'Two-Factor Authentication endpoints')
      .addTag('social', 'Social login endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Authentication Service is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();
