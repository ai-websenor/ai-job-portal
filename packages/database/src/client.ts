import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export function createDatabaseClient(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
