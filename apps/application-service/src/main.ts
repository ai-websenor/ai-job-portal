import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger';
import {ConfigService} from '@nestjs/config';
import {ResponseInterceptor} from '@ai-job-portal/common';
import {AppModule} from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('app.port', 3004);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // CORS
  app.enableCors({
    origin: '*',
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

  // Global Interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Job Portal - Application Service')
      .setDescription(
        'Application Service - Handles job applications, status updates, and interview scheduling',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('applications', 'Job application management - Apply for jobs, track applications')
      .addTag('status', 'Application status management - Update application status')
      .addTag('interviews', 'Interview scheduling - Schedule and manage interviews')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Expose swagger spec for Gateway
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/api/docs-json', (req, res) => {
      res.json(document);
    });
  }

  await app.listen(port, '0.0.0.0');

  console.log(`Application Service is running on http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api/docs`);
  console.log(`Environment: ${nodeEnv}`);
}

bootstrap();
