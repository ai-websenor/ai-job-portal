import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createProxyServer } from 'http-proxy';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { HttpExceptionFilter, CACHE_CONSTANTS } from '@ai-job-portal/common';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
    { rawBody: true },
  );

  // Capture raw multipart bytes into rawBody so the proxy can forward them unchanged.
  // The gateway never parses multipart — it just tunnels the bytes to the downstream service.
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      'multipart/form-data',
      { parseAs: 'buffer', bodyLimit: 50 * 1024 * 1024 },
      (req: any, body: Buffer, done: (err: Error | null, body?: Buffer) => void) => {
        req.rawBody = body;
        done(null, body);
      },
    );

  // Socket.io WebSocket proxy to messaging service (transparent pass-through)
  const messagingUrl = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3008';
  const wsProxy = createProxyServer({ target: messagingUrl, ws: true, changeOrigin: true });
  wsProxy.on('error', (err) => {
    logger.error(`WebSocket proxy error: ${err.message}`);
  });

  // Proxy Socket.io HTTP polling requests before Fastify processes them
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook('onRequest', async (request: any, reply: any) => {
    if (request.url.startsWith('/socket.io')) {
      wsProxy.web(request.raw, reply.raw);
      reply.hijack();
      return;
    }
  });

  // Initialize Redis client for blocked user checks
  const configService = app.get(ConfigService);
  const redisUrl = configService.get<string>('REDIS_URL');
  const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
  const redisPort = configService.get<number>('REDIS_PORT') || 6379;
  const useTls = configService.get<string>('REDIS_TLS') === 'true';
  const redisPassword = configService.get<string>('REDIS_PASSWORD');

  let parsedHost = redisHost;
  let parsedPort = redisPort;
  let parsedTls = useTls;

  if (redisUrl) {
    try {
      const normalizedUrl = redisUrl.replace(/^rediss:\/\//, 'redis://');
      const parsed = new URL(normalizedUrl);
      parsedHost = parsed.hostname;
      parsedPort = parseInt(parsed.port, 10) || 6379;
      parsedTls = redisUrl.startsWith('rediss://') || useTls;
    } catch {
      logger.error(`Failed to parse REDIS_URL, falling back to ${redisHost}:${redisPort}`);
    }
  }

  const redis = new Redis({
    host: parsedHost,
    port: parsedPort,
    ...(redisPassword && { password: redisPassword }),
    ...(parsedTls && { tls: {} }),
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on('connect', () => logger.log(`Gateway Redis connected to ${parsedHost}:${parsedPort}`));
  redis.on('error', (err) => logger.error(`Gateway Redis error: ${err.message}`));

  // Register JWT authentication hook (Fastify-compatible)
  const jwtService = app.get(JwtService);
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (request, reply) => {
      // Skip JWT validation for Socket.io requests (messaging service handles its own auth)
      if (request.url.startsWith('/socket.io')) return;

      const authHeader = request.headers.authorization;
      logger.log(`🚀 Auth Hook - ${request.method} ${request.url}`);
      logger.log(`🔐 Authorization header: ${authHeader ? 'Present' : 'Missing'}`);

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = jwtService.verify(token);

          // Check if user is blocked in Redis
          const isBlocked = await redis.get(`${CACHE_CONSTANTS.BLOCKED_USER_PREFIX}${payload.sub}`);

          if (isBlocked) {
            logger.warn(`🚫 Blocked user attempted access: ${payload.sub}`);
            const origin = request.headers.origin;
            reply
              .header('Access-Control-Allow-Origin', origin || '*')
              .header('Access-Control-Allow-Credentials', 'true')
              .status(401)
              .send({
                status: 'error',
                statusCode: 401,
                message: 'Your account has been blocked. Please contact support for assistance.',
                data: { errorCode: 'USER_BLOCKED' },
              });
            return;
          }

          (request as any).user = payload;
          logger.log(`✅ JWT verified, user: ${JSON.stringify(payload)}`);
        } catch (error: any) {
          logger.error(`❌ JWT verification failed: ${error?.message || error}`);
        }
      } else {
        logger.warn('⚠️  No Bearer token found');
      }
    });

  // Serve static files (health dashboard)
  app.useStaticAssets({
    root: join(__dirname, '..', '..', '..', 'public'),
    prefix: '/',
  });

  app.setGlobalPrefix('api/v1', { exclude: ['/', '/health-dashboard.html'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration - allow all origins for now (frontend still in local development)
  const corsOrigins = process.env.CORS_ORIGINS?.split(',');
  app.enableCors({
    origin: corsOrigins || '*',
    credentials: true,
  });

  // Swagger documentation with dynamic server URL
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const configBuilder = new DocumentBuilder()
    .setTitle('AI Job Portal API')
    .setDescription('Unified API Gateway for AI Job Portal Microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('jobs', 'Job listings')
    .addTag('applications', 'Job applications');

  // Add appropriate server based on environment
  if (isProduction) {
    configBuilder.addServer(apiBaseUrl, 'Production');
  } else {
    configBuilder.addServer(apiBaseUrl, 'Development');
  }

  const config = configBuilder.build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Proxy Socket.io WebSocket upgrade requests (raw TCP pass-through preserving all headers)
  const httpServer = app.getHttpServer();
  httpServer.on('upgrade', (req: any, socket: any, head: any) => {
    if (req.url?.startsWith('/socket.io')) {
      wsProxy.ws(req, socket, head);
    }
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway running on ${apiBaseUrl}`);
  logger.log(`WebSocket proxy: /socket.io/ -> ${messagingUrl}`);
  logger.log(`Swagger docs: ${apiBaseUrl}/api/docs`);
  logger.log(`Health Dashboard: ${apiBaseUrl}/health-dashboard.html`);
  logger.log(`Environment: ${isProduction ? 'production' : 'development'}`);
}

bootstrap();
// CI/CD: auto-deploy to ECS v1
