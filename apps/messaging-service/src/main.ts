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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Messaging Service')
    .setDescription('AI Job Portal - Messaging & Chat API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('threads', 'Message thread endpoints')
    .addTag('messages', 'Direct message endpoints')
    .addTag('chat', 'Chatbot session endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3008;
  await app.listen(port, '0.0.0.0');
  console.log(`Messaging Service running on http://localhost:${port}`);
}

bootstrap();
