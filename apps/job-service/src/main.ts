import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app.module';
import { HttpExceptionFilter, ResponseInterceptor } from '@ai-job-portal/common';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Optional JWT parsing hook - populates req.user on all routes (including @Public)
  // This enables isSaved checks on public endpoints when a Bearer token is provided
  const jwtService = app.get(JwtService);
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (request, _reply) => {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = jwtService.verify(token);
          (request as any).user = payload;
        } catch {
          // Token invalid/expired - continue without user
        }
      }
    });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Job Service')
    .setDescription('AI Job Portal - Job Listings & Search API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('jobs', 'Job CRUD operations')
    .addTag('categories', 'Job categories')
    .addTag('skills', 'Skills management')
    .addTag('search', 'Job search with filters')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port, '0.0.0.0');
  console.log(`Job Service running on http://localhost:${port}`);
}

bootstrap();
