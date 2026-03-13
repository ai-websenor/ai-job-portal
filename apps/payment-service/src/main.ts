import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter, ResponseInterceptor } from '@ai-job-portal/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('PaymentService');

  const adapter = new FastifyAdapter({ bodyLimit: 1048576 });

  // Register raw body hook BEFORE NestJS registers its own parser
  // This stores the raw buffer on every request for Stripe webhook verification
  adapter.getInstance().addHook('preParsing', (req: any, _reply: any, payload: any, done: any) => {
    const chunks: Buffer[] = [];
    payload.on('data', (chunk: Buffer) => chunks.push(chunk));
    payload.on('end', () => {
      req.rawBodyBuffer = Buffer.concat(chunks);
      done(null, require('stream').Readable.from(req.rawBodyBuffer));
    });
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

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
