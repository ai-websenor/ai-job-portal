import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter, ResponseInterceptor, LoggingInterceptor } from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new CustomLogger();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1048576 }),
    { rawBody: true },
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  // Use Custom Logger
  app.useLogger(logger);

  app.useGlobalInterceptors(new ResponseInterceptor(), new LoggingInterceptor());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Payment Service API')
    .setDescription('AI Job Portal - Payment & Subscription Management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('payments', 'Payment processing')
    .addTag('subscriptions', 'Subscription management')
    .addTag('invoices', 'Invoice management')
    .addTag('webhooks', 'Payment provider webhooks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3006;
  await app.listen(port, '0.0.0.0');
  logger.log(`Payment Service running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
