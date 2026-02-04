import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function updateUserRole() {
  console.log('🔄 Updating user role to super_admin...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('rds.amazonaws.com') || DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle(pool);

  try {
    const superAdminEmail = 'jobboardsuperadmin@gmail.com';
    console.log(`🔍 Updating user: ${superAdminEmail}`);

    await db
      .update(users)
      .set({ role: 'super_admin' as any })
      .where(eq(users.email, superAdminEmail));

    console.log('✅ User role updated to super_admin');
    console.log('\n💡 Please login again to see the updated role in the response.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateUserRole();
