import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigrations() {
  console.log('Running database migrations...');

  // Remove sslmode from connection string - handle SSL config separately
  const cleanConnectionString = databaseUrl!.replace(/[?&]sslmode=[^&]*/g, '');

  const pool = new Pool({
    connectionString: cleanConnectionString,
    max: 1,
    ssl: databaseUrl!.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, '../drizzle'),
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
