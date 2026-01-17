import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';
import * as relations from './relations';

// Merge schema tables with their relations for relational queries
const schemaWithRelations = { ...schema, ...relations };

export function createDatabaseClient(connectionString: string) {
  const config: PoolConfig = {
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  // Enable SSL for RDS/cloud databases (when sslmode is in connection string)
  if (connectionString.includes('sslmode=')) {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);
  return drizzle(pool, { schema: schemaWithRelations });
}

export type Database = ReturnType<typeof createDatabaseClient>;
