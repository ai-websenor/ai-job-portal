import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseClient, Database } from '@ai-job-portal/database';

export const DATABASE_CLIENT = 'DATABASE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: (configService: ConfigService): Database => {
        const connectionString = configService.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL is not defined');
        }
        return createDatabaseClient(connectionString);
      },
      inject: [ConfigService],
    },
    // Alias for services that expect 'DATABASE' injection token
    {
      provide: 'DATABASE',
      useExisting: DATABASE_CLIENT,
    },
  ],
  exports: [DATABASE_CLIENT, 'DATABASE'],
})
export class DatabaseModule {}
