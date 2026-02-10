import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseClient } from '@ai-job-portal/database';

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
          return createDatabaseClient(databaseUrl);
        }

        // Fallback to individual environment variables
        logger.log('Connecting to database using individual env variables');
        const host = configService.get('DATABASE_HOST');
        const port = configService.get('DATABASE_PORT', 5432);
        const user = configService.get('DATABASE_USER');
        const password = configService.get('DATABASE_PASSWORD');
        const dbName = configService.get('DATABASE_NAME');
        const ssl = configService.get('DATABASE_SSL') === 'true';

        const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}${ssl ? '?sslmode=require' : ''}`;

        return createDatabaseClient(connectionString);
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CLIENT],
})
export class DatabaseModule {}
