/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ResponseInterceptor,
  HttpExceptionFilter,
} from '@ai-job-portal/common';

async function bootstrap() {
  const logger = new Logger('JobService');

  // Create HTTP application
  const app = await NestFactory.create(AppModule);
  // const configService = app.get(ConfigService);

  // Global Response Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Connect gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'job',
      protoPath: join(__dirname, '../proto/job.proto'),
      url: '0.0.0.0:50052', // gRPC port (HTTP on 3003)
    },
  });

  // Global Config
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter - Centralized error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Job Service')
    .setDescription('Job Service API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Expose swagger spec for Gateway
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/docs-json', (req, res) => {
    res.json(document);
  });

  // Start Microservice and HTTP Server
  await app.startAllMicroservices();
  await app.listen(3003); // HTTP on 3003
  logger.log(`Job Service HTTP running on: ${await app.getUrl()}`);
  logger.log(`Job Service gRPC running on: 0.0.0.0:50052`);
}
void bootstrap();
