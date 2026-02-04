import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function alterEnum() {
  console.log('🔧 Adding super_admin to user_role enum...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('rds.amazonaws.com') || DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    // Add super_admin to the enum type
    await pool.query(`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    `);

    console.log('✅ super_admin added to user_role enum');

    // Now update the user's role
    const superAdminEmail = 'jobboardsuperadmin@gmail.com';
    console.log(`\n🔄 Updating user: ${superAdminEmail}`);

    await pool.query(`
      UPDATE users
      SET role = 'super_admin'
      WHERE email = $1
    `, [superAdminEmail]);

    console.log('✅ User role updated to super_admin');
    console.log('\n💡 Please login again to see the updated role in the response.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

alterEnum();
