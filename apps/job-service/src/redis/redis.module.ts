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

        if (redisUrl) {
          const client = new Redis(redisUrl, {
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 100, 3000),
          });
          client.on('connect', () => logger.log('Redis connected via URL'));
          client.on('error', (err) => logger.error('Redis error', err.message));
          return client;
        }

        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('REDIS_PORT') || 6379;
        const useTls = configService.get<string>('REDIS_TLS') === 'true';

        const client = new Redis({
          host,
          port,
          ...(useTls && { tls: {} }),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        client.on('connect', () =>
          logger.log(`Redis connected to ${host}:${port} (TLS: ${useTls})`),
        );
        client.on('error', (err) => logger.error('Redis error', err.message));
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
