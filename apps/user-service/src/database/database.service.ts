import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@ai-job-portal/database';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private _db: PostgresJsDatabase<typeof schema>;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('database.url');

    this.logger.log('Initializing database connection...');

    const client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    this._db = drizzle(client, { schema });

    this.logger.log('Database connection initialized successfully');
  }

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this._db) {
      throw new Error('Database not initialized');
    }
    return this._db;
  }
}
