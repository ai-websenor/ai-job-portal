import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, roles, userRoles } from '../schema';
import { eq, and } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function grantSuperAdminRole() {
  console.log('🔐 Granting SUPER_ADMIN role to super admin user...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('rds.amazonaws.com') || DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle(pool);

  try {
    // Find the super admin user by email
    const superAdminEmail = 'jobboardsuperadmin@gmail.com';
    console.log(`🔍 Looking for user: ${superAdminEmail}`);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, superAdminEmail))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found: ${superAdminEmail}`);
      await pool.end();
      return;
    }

    console.log(`✅ User found: ${user.id}\n`);

    // Find SUPER_ADMIN role
    const [superAdminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'SUPER_ADMIN'))
      .limit(1);

    if (!superAdminRole) {
      console.error('❌ SUPER_ADMIN role not found. Please run rbac-seed.ts first.');
      await pool.end();
      return;
    }

    console.log(`✅ SUPER_ADMIN role found: ${superAdminRole.id}\n`);

    // Check if user already has SUPER_ADMIN role
    const [existingUserRole] = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, user.id),
          eq(userRoles.roleId, superAdminRole.id)
        )
      )
      .limit(1);

    if (existingUserRole) {
      console.log('ℹ️  User already has SUPER_ADMIN role');

      // Check if it's active
      if (!existingUserRole.isActive) {
        console.log('🔄 Reactivating SUPER_ADMIN role...');
        await db
          .update(userRoles)
          .set({ isActive: true })
          .where(eq(userRoles.id, existingUserRole.id));
        console.log('✅ SUPER_ADMIN role reactivated');
      } else {
        console.log('✅ SUPER_ADMIN role is already active');
      }
    } else {
      // Grant SUPER_ADMIN role
      console.log('➕ Granting SUPER_ADMIN role...');
      await db.insert(userRoles).values({
        userId: user.id,
        roleId: superAdminRole.id,
        grantedBy: user.id, // Self-granted for initial setup
        isActive: true,
      });
      console.log('✅ SUPER_ADMIN role granted successfully');
    }

    // Update user flags
    console.log('\n🔄 Updating user flags...');
    await db
      .update(users)
      .set({
        isSuperAdmin: true,
        isAdmin: true,
      })
      .where(eq(users.id, user.id));
    console.log('✅ User flags updated');

    console.log('\n✨ Done! User can now access admin panel.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

grantSuperAdminRole();
