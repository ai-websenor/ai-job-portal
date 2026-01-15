import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@ai-job-portal/database';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new CustomLogger();
  private _db: PostgresJsDatabase<typeof schema>;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('database.url');

    this.logger.info('Initializing database connection...', 'DatabaseService');

    const client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    this._db = drizzle(client, { schema });

    this.logger.success('Database connection initialized successfully', 'DatabaseService');
  }

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    return this._db;
  }
}
