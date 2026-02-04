import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

async function applySchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔨 Applying RBAC schema to database...');

  const cleanConnectionString = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '');
  const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: databaseUrl.includes('sslmode') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();

    console.log('✅ Connected to database');

    // Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        name varchar(50) NOT NULL UNIQUE,
        description text,
        is_system_role boolean DEFAULT false NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Created roles table');

    // Create permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        code varchar(100) NOT NULL UNIQUE,
        resource varchar(50) NOT NULL,
        action varchar(50) NOT NULL,
        description text,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Created permissions table');

    // Create role_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE cascade,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE cascade,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Created role_permissions table');

    // Create user_roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE cascade,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE cascade,
        granted_by uuid REFERENCES users(id),
        granted_at timestamp DEFAULT now() NOT NULL,
        expires_at timestamp,
        is_active boolean DEFAULT true NOT NULL
      );
    `);
    console.log('✅ Created user_roles table');

    // Add columns to users table
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false NOT NULL;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;
    `);
    console.log('✅ Added is_super_admin and is_admin columns to users table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS permissions_resource_idx ON permissions(resource);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS permissions_action_idx ON permissions(action);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_unique ON role_permissions(role_id, permission_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON role_permissions(role_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON role_permissions(permission_id);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique ON user_roles(user_id, role_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role_id);
    `);
    console.log('✅ Created all indexes');

    client.release();
    console.log('\n✨ RBAC schema applied successfully!');

  } catch (error) {
    console.error('❌ Error applying schema:', error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

applySchema();
