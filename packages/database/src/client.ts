import { drizzle } from 'drizzle-orm/node-postgres';
import { Logger as DrizzleLogger } from 'drizzle-orm/logger';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';
import * as relations from './relations';

// Merge schema tables with their relations for relational queries
const schemaWithRelations = { ...schema, ...relations };

const SLOW_QUERY_MS = 100;

function truncateQuery(query: string): string {
  return query.length > 200 ? query.slice(0, 200) + '...' : query;
}

// Dev/staging query logger — logs SQL with duration, flags slow queries
class QueryLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    const paramStr = params.length > 0 ? ` params=[${params.length}]` : '';
    console.debug(`[DB] ${truncateQuery(query)}${paramStr}`);
  }
}

// Drizzle's logger fires before execution (no duration available), so timing
// is measured at the pool level instead. Warns on any query >= SLOW_QUERY_MS.
function instrumentPoolForSlowQueries(pool: Pool): void {
  const originalQuery = pool.query.bind(pool);
  const wrapped = (...args: unknown[]): unknown => {
    const start = Date.now();
    const result = (originalQuery as (...a: unknown[]) => unknown)(...args);
    if (result instanceof Promise) {
      return result.finally(() => {
        const durationMs = Date.now() - start;
        if (durationMs >= SLOW_QUERY_MS) {
          const first = args[0] as string | { text?: string } | undefined;
          const text = typeof first === 'string' ? first : (first?.text ?? '');
          console.warn(`[DB] SLOW_QUERY ${durationMs}ms: ${truncateQuery(text)}`);
        }
      });
    }
    return result;
  };
  (pool as unknown as { query: unknown }).query = wrapped;
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

  // DB_POOL_MAX lets low-traffic services run a smaller pool than the shared
  // Postgres instance's max_connections can afford across all 9 services.
  const poolMax = Number(process.env.DB_POOL_MAX) || 20;

  const config: PoolConfig = {
    connectionString: cleanConnectionString,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Enable SSL for RDS/cloud databases (when sslmode was in original connection string)
  if (connectionString.includes('sslmode=')) {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);
  instrumentPoolForSlowQueries(pool);

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
