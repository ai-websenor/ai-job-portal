import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function fixCompaniesSchema() {
  console.log('🔧 Checking and fixing companies table schema...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('rds.amazonaws.com') || DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    // Check if is_active column exists
    const checkColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'companies'
      AND column_name = 'is_active'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column companies.is_active already exists');
    } else {
      console.log('➕ Adding is_active column to companies table...');

      await pool.query(`
        ALTER TABLE companies
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL
      `);

      console.log('✅ Column added successfully');
    }

    // Verify the column exists now
    const verify = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'companies'
      AND column_name = 'is_active'
    `);

    if (verify.rows.length > 0) {
      console.log('\n✅ Verification successful:');
      console.log(verify.rows[0]);
    } else {
      console.log('\n❌ Column still not found after adding!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixCompaniesSchema();
