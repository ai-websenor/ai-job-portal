import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { ResponseInterceptor, GlobalExceptionFilter } from '@ai-job-portal/common';
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

  // Global Response Interceptor and Exception Filter
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Security - helmet disabled due to version conflict
  // await app.register(helmet, {
  //   contentSecurityPolicy: nodeEnv === 'production',
  // });

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

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

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

  // Start HTTP server
  await app.listen(port, '0.0.0.0');

  // Connect gRPC microservice
  const grpcPort = configService.get<number>('grpc.port', 50051);
  const protoPath = join(__dirname, '../proto/auth.proto');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: protoPath,
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();

  logger.success(`Authentication Service is running on`, 'Bootstrap', {
    url: `http://localhost:${port}`,
  });
  logger.info(`gRPC Server is running on`, 'Bootstrap', { url: `localhost:${grpcPort}` });
  logger.info(`API Documentation`, 'Bootstrap', { url: `http://localhost:${port}/api/docs` });
  logger.info(`Environment`, 'Bootstrap', { env: nodeEnv });
}

bootstrap();
