import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@ai-job-portal/database';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    public readonly db: NodePgDatabase<typeof schema>,
  ) {}
}
