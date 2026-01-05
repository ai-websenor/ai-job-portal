import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../../../.env') }); // package.json is in packages/database, so .env is at ../../.env

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function main() {
  console.log('Running migrations...');
  const migrationsFolder = path.join(__dirname, '../drizzle');

  await migrate(db, { migrationsFolder });

  console.log('Migrations completed successfully!');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed!');
  console.error(err);
  process.exit(1);
});
