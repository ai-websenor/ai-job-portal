import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter, ResponseInterceptor } from '@ai-job-portal/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Notification Service')
    .setDescription('AI Job Portal - Email, SMS & Push Notifications API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('notifications', 'User notifications')
    .addTag('preferences', 'Notification preferences')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port, '0.0.0.0');
  console.log(`Notification Service running on http://localhost:${port}`);
}

bootstrap();
