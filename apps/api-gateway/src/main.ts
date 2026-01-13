import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import proxy from '@fastify/http-proxy';
import { AppModule } from './app.module';
import { ResponseInterceptor } from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { HttpExceptionFilter } from '@ai-job-portal/common';
import { AuthMiddleware } from './auth.middleware';
import { randomUUID } from 'crypto';

async function bootstrap() {
  const logger = new CustomLogger();

  process.on('unhandledRejection', (reason) => {
    logger.error(
      'Unhandled Promise Rejection - Application may be unstable',
      reason instanceof Error ? reason : new Error(String(reason)),
      'ProcessError',
      {
        type: 'unhandledRejection',
        timestamp: new Date().toISOString(),
      },
    );
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception - Application will terminate', error, 'ProcessError', {
      type: 'uncaughtException',
      timestamp: new Date().toISOString(),
    });
    // Allow graceful shutdown
    process.exit(1);
  });

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

  app.use(new AuthMiddleware().use);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  await app.register(helmet as any, {
    contentSecurityPolicy: nodeEnv === 'production',
  });

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Microservice URLs
  const authServiceUrl = configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');
  const userServiceUrl = configService.get<string>('USER_SERVICE_URL', 'http://localhost:3002');
  const jobServiceUrl = configService.get<string>('JOB_SERVICE_URL', 'http://localhost:3003');
  const applicationServiceUrl = configService.get<string>(
    'APPLICATION_SERVICE_URL',
    'http://localhost:3004',
  );

  // Request & Proxy Logging Hooks
  const fastify = app.getHttpAdapter().getInstance();

  const proxyTargets = [
    { prefix: '/api/v1/auth', target: authServiceUrl },
    { prefix: '/api/v1/profile', target: userServiceUrl },
    { prefix: '/api/v1/candidate/profile', target: userServiceUrl },
    { prefix: '/api/v1/candidate/resumes', target: userServiceUrl },
    { prefix: '/api/v1/candidate/experience', target: userServiceUrl },
    { prefix: '/api/v1/candidate/education', target: userServiceUrl },
    { prefix: '/api/v1/candidate/preferences', target: userServiceUrl },
    { prefix: '/api/v1/onboarding', target: userServiceUrl },
    { prefix: '/api/v1/experience', target: userServiceUrl },
    { prefix: '/api/v1/education', target: userServiceUrl },
    { prefix: '/api/v1/skills', target: userServiceUrl },
    { prefix: '/api/v1/certifications', target: userServiceUrl },
    { prefix: '/api/v1/resumes', target: userServiceUrl },
    { prefix: '/api/v1/preferences', target: userServiceUrl },
    { prefix: '/api/v1/documents', target: userServiceUrl },
    { prefix: '/api/v1/jobs', target: jobServiceUrl },
    { prefix: '/api/v1/companies', target: jobServiceUrl },
    { prefix: '/api/v1/saved-searches', target: jobServiceUrl },
    { prefix: '/api/v1/applications', target: applicationServiceUrl },
    { prefix: '/api/v1/status', target: applicationServiceUrl },
    { prefix: '/api/v1/interviews', target: applicationServiceUrl },
  ];

  fastify.addHook('onRequest', (request: any, reply, done) => {
    request.startTime = Date.now();
    request.id = request.id || randomUUID();

    const proxyMatch = proxyTargets.find((p) => request.url.startsWith(p.prefix));
    if (proxyMatch) {
      logger.debug(`Proxying request to ${proxyMatch.target}`, 'GatewayProxy', {
        method: request.method,
        url: request.url,
        target: proxyMatch.target,
        requestId: request.id,
      });
    }
    done();
  });

  fastify.addHook('onResponse', (request: any, reply, done) => {
    const responseTime = Date.now() - (request.startTime || Date.now());
    const user = request.raw.user;

    logger.info(`HTTP ${request.method} ${request.url}`, 'Gateway', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime}ms`,
      requestId: request.id,
      userId: user?.id,
      email: user?.email,
      role: user?.role,
    });
    done();
  });

  // Register HTTP proxies to microservices
  // Auth Service routes
  await app.register(proxy as any, {
    upstream: authServiceUrl,
    prefix: '/api/v1/auth',
    rewritePrefix: '/api/v1/auth',
    http2: false,
  });

  // User Service routes - profile management
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/profile',
    rewritePrefix: '/api/v1/profile',
    http2: false,
  });

  // User Service routes - candidate profile (used by auth service during registration)
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/candidate/profile',
    rewritePrefix: '/api/v1/candidate/profile',
    http2: false,
  });

  // User Service routes - candidate resumes
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/candidate/resumes',
    rewritePrefix: '/api/v1/candidate/resumes',
    http2: false,
  });

  // User Service routes - candidate experience
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/candidate/experience',
    rewritePrefix: '/api/v1/candidate/experience',
    http2: false,
  });

  // User Service routes - candidate education
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/candidate/education',
    rewritePrefix: '/api/v1/candidate/education',
    http2: false,
  });

  // User Service routes - candidate preferences
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/candidate/preferences',
    rewritePrefix: '/api/v1/candidate/preferences',
    http2: false,
  });

  // User Service routes - onboarding
  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/onboarding',
    rewritePrefix: '/api/v1/onboarding',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/experience',
    rewritePrefix: '/api/v1/experience',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/education',
    rewritePrefix: '/api/v1/education',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/candidate/skills',
    rewritePrefix: '/api/v1/candidate/skills',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/certifications',
    rewritePrefix: '/api/v1/certifications',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/resumes',
    rewritePrefix: '/api/v1/resumes',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/preferences',
    rewritePrefix: '/api/v1/preferences',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: userServiceUrl,
    prefix: '/api/v1/documents',
    rewritePrefix: '/api/v1/documents',
    http2: false,
  });

  // Job Service routes
  await app.register(proxy as any, {
    upstream: jobServiceUrl,
    prefix: '/api/v1/jobs',
    rewritePrefix: '/api/v1/jobs',
    http2: false,
  });

  // Company routes (Job Service)
  await app.register(proxy as any, {
    upstream: jobServiceUrl,
    prefix: '/api/v1/companies',
    rewritePrefix: '/api/v1/companies',
    http2: false,
  });

  // Saved Searches routes (Job Service)
  await app.register(proxy as any, {
    upstream: jobServiceUrl,
    prefix: '/api/v1/saved-searches',
    rewritePrefix: '/api/v1/saved-searches',
    http2: false,
  });

  // Application Service routes
  await app.register(proxy as any, {
    upstream: applicationServiceUrl,
    prefix: '/api/v1/applications',
    rewritePrefix: '/api/v1/applications',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: applicationServiceUrl,
    prefix: '/api/v1/status',
    rewritePrefix: '/api/v1/status',
    http2: false,
  });

  await app.register(proxy as any, {
    upstream: applicationServiceUrl,
    prefix: '/api/v1/interviews',
    rewritePrefix: '/api/v1/interviews',
    http2: false,
  });

  logger.info('Proxy routes configured', 'Bootstrap', {
    authServiceUrl,
    userServiceUrl,
    jobServiceUrl,
    applicationServiceUrl,
  });

  // Global prefix for gateway's own routes (health checks, etc.)
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
  // Logs: error message, stack trace, request path, HTTP method, userId, email, role
  // Handles both HttpException and unknown errors
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation - Aggregated from all microservices
  if (nodeEnv !== 'production') {
    // API Gateway's own spec
    const gatewayConfig = new DocumentBuilder()
      .setTitle('AI Job Portal - API Gateway')
      .setDescription('API Gateway endpoints and routing')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health', 'Health check endpoints')
      .addTag('gateway', 'Gateway specific endpoints')
      .build();

    const gatewayDocument = SwaggerModule.createDocument(app, gatewayConfig);

    // Proxy endpoints to fetch OpenAPI specs from microservices (avoids CORS)
    const httpAdapter = app.getHttpAdapter();

    httpAdapter.get('/api/docs/auth-spec', async (_req, res) => {
      try {
        const response = await fetch(`${authServiceUrl}/api/docs-json`);
        if (!response.ok) {
          logger.warn(`Auth Service returned ${response.status}: ${response.statusText}`);
          res.status(503).send({
            error: 'Auth Service unavailable',
            message: `Failed to fetch Swagger spec from ${authServiceUrl}/api/docs-json`,
            status: response.status,
          });
          return;
        }
        const spec = await response.json();
        res.send(spec);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to fetch Auth Service spec: ${errorMessage}`);
        res.status(503).send({
          error: 'Auth Service unavailable',
          message: `Cannot connect to ${authServiceUrl}/api/docs-json`,
          details: errorMessage,
        });
      }
    });

    httpAdapter.get('/api/docs/user-spec', async (_req, res) => {
      try {
        const response = await fetch(`${userServiceUrl}/api/docs-json`);
        if (!response.ok) {
          logger.warn(`User Service returned ${response.status}: ${response.statusText}`);
          res.status(503).send({
            error: 'User Service unavailable',
            message: `Failed to fetch Swagger spec from ${userServiceUrl}/api/docs-json`,
            status: response.status,
          });
          return;
        }
        const spec = await response.json();
        res.send(spec);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to fetch User Service spec: ${errorMessage}`);
        res.status(503).send({
          error: 'User Service unavailable',
          message: `Cannot connect to ${userServiceUrl}/api/docs-json`,
          details: errorMessage,
        });
      }
    });

    httpAdapter.get('/api/docs/job-spec', async (_req, res) => {
      try {
        const response = await fetch(`${jobServiceUrl}/api/docs-json`);
        if (!response.ok) {
          logger.warn(`Job Service returned ${response.status}: ${response.statusText}`);
          res.status(503).send({
            error: 'Job Service unavailable',
            message: `Failed to fetch Swagger spec from ${jobServiceUrl}/api/docs-json`,
            status: response.status,
          });
          return;
        }
        const spec = await response.json();
        res.send(spec);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to fetch Job Service spec: ${errorMessage}`);
        res.status(503).send({
          error: 'Job Service unavailable',
          message: `Cannot connect to ${jobServiceUrl}/api/docs-json`,
          details: errorMessage,
        });
      }
    });

    httpAdapter.get('/api/docs/application-spec', async (_req, res) => {
      try {
        const response = await fetch(`${applicationServiceUrl}/api/docs-json`);
        if (!response.ok) {
          logger.warn(`Application Service returned ${response.status}: ${response.statusText}`);
          res.status(503).send({
            error: 'Application Service unavailable',
            message: `Failed to fetch Swagger spec from ${applicationServiceUrl}/api/docs-json`,
            status: response.status,
          });
          return;
        }
        const spec = await response.json();
        res.send(spec);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to fetch Application Service spec: ${errorMessage}`);
        res.status(503).send({
          error: 'Application Service unavailable',
          message: `Cannot connect to ${applicationServiceUrl}/api/docs-json`,
          details: errorMessage,
        });
      }
    });

    // Setup Swagger UI with proxied spec URLs (same origin, no CORS issues)
    SwaggerModule.setup('api/docs', app, gatewayDocument, {
      explorer: true,
      swaggerOptions: {
        urls: [
          { url: '/api/docs/auth-spec', name: 'Auth Service' },
          { url: '/api/docs/user-spec', name: 'User Service' },
          { url: '/api/docs/job-spec', name: 'Job Service' },
          { url: '/api/docs/application-spec', name: 'Application Service' },
          { url: '/api/docs-json', name: 'API Gateway' },
        ],
        'urls.primaryName': 'Auth Service',
      },
      customSiteTitle: 'AI Job Portal - API Documentation',
    });
  }

  await app.listen(port, '0.0.0.0');

  logger.success('API Gateway started', 'Bootstrap', {
    port,
    env: nodeEnv,
    url: `http://localhost:${port}`,
  });
}

bootstrap();
