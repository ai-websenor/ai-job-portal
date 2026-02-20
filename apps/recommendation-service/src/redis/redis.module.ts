import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        const logger = new Logger('RedisModule');
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const useTls = configService.get<string>('REDIS_TLS') === 'true';
        const password = configService.get<string>('REDIS_PASSWORD');

        let host = 'localhost';
        let port = 6379;
        let tls = false;

        // Parse connection info from URL or individual env vars
        if (redisHost) {
          host = redisHost;
          port = redisPort;
          tls = useTls;
        } else if (redisUrl) {
          try {
            const normalizedUrl = redisUrl.replace(/^rediss:\/\//, 'redis://');
            const parsed = new URL(normalizedUrl);
            host = parsed.hostname;
            port = parseInt(parsed.port, 10) || 6379;
            tls = redisUrl.startsWith('rediss://') || useTls;
          } catch {
            logger.error(`Failed to parse REDIS_URL: ${redisUrl}, falling back to localhost`);
          }
        }

        logger.log(`Connecting to Redis at ${host}:${port} (TLS: ${tls})`);

        const client = new Redis({
          host,
          port,
          ...(password && { password }),
          ...(tls && { tls: {} }),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        client.on('connect', () => logger.log(`Redis connected to ${host}:${port} (TLS: ${tls})`));
        client.on('error', (err) => logger.error('Redis error', err.message));
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
