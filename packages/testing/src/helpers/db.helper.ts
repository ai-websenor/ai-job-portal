import { sql } from 'drizzle-orm';

/**
 * Database helper for E2E tests
 * Provides utilities for seeding, cleanup, and test isolation
 */

export interface DbHelperConfig {
  testPrefix?: string;
  enableTransactions?: boolean;
}

/**
 * Clean up test data by prefix
 * Uses test_ prefix to identify test-created records
 */
export async function cleanupTestData(
  db: any,
  tables: string[],
  prefix: string = 'test_',
): Promise<void> {
  // Delete in reverse order to handle foreign key constraints
  const reversedTables = [...tables].reverse();

  for (const table of reversedTables) {
    try {
      await db.execute(
        sql`DELETE FROM ${sql.identifier(table)} WHERE email LIKE ${prefix + '%'} OR id::text LIKE ${prefix + '%'}`,
      );
    } catch (error) {
      // Table might not have email column, try alternative cleanup
      console.warn(`Cleanup warning for ${table}:`, error);
    }
  }
}

/**
 * Truncate tables (use with caution, only for isolated test DBs)
 */
export async function truncateTables(db: any, tables: string[]): Promise<void> {
  const tableList = tables.join(', ');
  await db.execute(sql`TRUNCATE TABLE ${sql.raw(tableList)} RESTART IDENTITY CASCADE`);
}

/**
 * Seed test data
 */
export async function seedTestData<T>(
  db: any,
  table: any,
  data: T[],
): Promise<T[]> {
  const results = await db.insert(table).values(data).returning();
  return results;
}

/**
 * Get record count for a table
 */
export async function getTableCount(db: any, tableName: string): Promise<number> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`,
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Verify user email directly in database (for testing)
 */
export async function verifyUserEmail(db: any, userId: string): Promise<void> {
  await db.execute(
    sql`UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = ${userId}`,
  );
}

/**
 * Create test transaction wrapper
 */
export async function withTestTransaction<T>(
  db: any,
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx: any) => {
    const result = await callback(tx);
    // Rollback to keep test isolation
    throw new Error('ROLLBACK_TEST_TRANSACTION');
  }).catch((error: Error) => {
    if (error.message === 'ROLLBACK_TEST_TRANSACTION') {
      return undefined as T;
    }
    throw error;
  });
}
