import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@ai-job-portal/database';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly db: PostgresJsDatabase<typeof schema>,
  ) {}
}
