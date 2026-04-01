import { drizzle } from 'drizzle-orm/node-postgres';
import { Logger as DrizzleLogger } from 'drizzle-orm/logger';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';
import * as relations from './relations';

// Merge schema tables with their relations for relational queries
const schemaWithRelations = { ...schema, ...relations };

const SLOW_QUERY_MS = 100;

// Dev/staging query logger — logs SQL with duration, flags slow queries
class QueryLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    const truncatedQuery = query.length > 200 ? query.slice(0, 200) + '...' : query;
    const paramStr = params.length > 0 ? ` params=[${params.length}]` : '';
    console.debug(`[DB] ${truncatedQuery}${paramStr}`);
  }
}

// Enabled when LOG_LEVEL=debug or NODE_ENV is not production
function shouldEnableQueryLog(): boolean {
  const logLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (logLevel === 'debug') return true;
  if (logLevel === 'silent' || logLevel === 'error' || logLevel === 'warn') return false;
  return process.env.NODE_ENV !== 'production';
}

export function createDatabaseClient(connectionString: string) {
  // Remove sslmode from connection string - we'll handle SSL config separately
  const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');

  const config: PoolConfig = {
    connectionString: cleanConnectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  // Enable SSL for RDS/cloud databases (when sslmode was in original connection string)
  if (connectionString.includes('sslmode=')) {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);

  // Log pool connection events in dev/staging
  if (shouldEnableQueryLog()) {
    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
    });
  }

  return drizzle(pool, {
    schema: schemaWithRelations,
    logger: shouldEnableQueryLog() ? new QueryLogger() : false,
  });
}

export type Database = ReturnType<typeof createDatabaseClient>;
