import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@ai-job-portal/database';

export const DATABASE_CLIENT = 'DATABASE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const databaseUrl = configService.get('DATABASE_URL');

        if (databaseUrl) {
          logger.log('Connecting to database using DATABASE_URL');
          // Parse DATABASE_URL to extract SSL mode
          const requireSsl = databaseUrl.includes('sslmode=require');
          const pool = new Pool({
            connectionString: databaseUrl,
            ssl: requireSsl ? { rejectUnauthorized: false } : false,
          });
          return drizzle(pool, { schema });
        }

        // Fallback to individual environment variables
        logger.log('Connecting to database using individual env variables');
        const pool = new Pool({
          host: configService.get('DATABASE_HOST'),
          port: configService.get('DATABASE_PORT', 5432),
          user: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          ssl: configService.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        });
        return drizzle(pool, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CLIENT],
})
export class DatabaseModule {}
