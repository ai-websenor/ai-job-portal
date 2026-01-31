import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Also try loading from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.dev') });

import { createDatabaseClient, users } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// ============================================
// SUPER ADMIN SEED SCRIPT
// ============================================
// This script creates the Super Admin user and generates
// a permanent (non-expiring) access token.
//
// Usage: npx ts-node scripts/seed-superadmin.ts
// ============================================

// Hardcoded Super Admin credentials (DO NOT CHANGE)
const SUPER_ADMIN_EMAIL = 'jobboardsuperadmin@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Superadmin@1234';

// Environment checks
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is missing from environment!');
  console.error('Please ensure .env.dev or .env file has JWT_SECRET defined.');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL is missing from environment!');
  process.exit(1);
}

// Database Connection
const db = createDatabaseClient(DATABASE_URL);

async function seedSuperAdmin() {
  console.log('\n=========================================');
  console.log('🔐 SUPER ADMIN SEED SCRIPT');
  console.log('=========================================\n');

  try {
    // 1. Check if super admin user exists
    console.log(`📧 Checking for existing super admin: ${SUPER_ADMIN_EMAIL}`);
    let user = await db.query.users.findFirst({
      where: eq(users.email, SUPER_ADMIN_EMAIL.toLowerCase()),
    });

    if (!user) {
      console.log('- Super Admin does not exist. Creating...');

      // Hash the password
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

      // Create super admin user
      const [newUser] = await db
        .insert(users)
        .values({
          firstName: 'Super',
          lastName: 'Admin',
          email: SUPER_ADMIN_EMAIL.toLowerCase(),
          password: hashedPassword,
          mobile: '+919999999999',
          role: 'admin',
          isVerified: true,
          isMobileVerified: true,
          isActive: true,
          onboardingStep: 0,
          isOnboardingCompleted: true,
        })
        .returning();

      user = newUser;
      console.log(`✅ Super Admin created with ID: ${user.id}`);
    } else {
      console.log(`✅ Super Admin already exists with ID: ${user.id}`);

      // Ensure the user has admin role
      if (user.role !== 'admin') {
        console.log(`- Updating role to 'admin'...`);
        await db
          .update(users)
          .set({ role: 'admin', isVerified: true, isActive: true })
          .where(eq(users.id, user.id));
      }
    }

    // 2. Generate non-expiring token (100 years)
    console.log('\n🎟️  Generating permanent access token...');

    const payload = {
      sub: user.id,
      email: user.email,
      role: 'admin',
    };

    // Generate token with 100 years expiry (effectively never expires)
    const accessToken = jwt.sign(payload, JWT_SECRET!, {
      expiresIn: '36500d', // 100 years
    });

    // 3. Output the token
    console.log('\n=========================================');
    console.log('🎉 SUPER ADMIN TOKEN GENERATED');
    console.log('=========================================\n');

    console.log('📋 Super Admin Details:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: admin`);
    console.log(`   Token Expiry: ~100 years (never expires)`);

    console.log('\n📝 Copy the token below:');
    console.log('-----------------------------------------');
    console.log(`Bearer ${accessToken}`);
    console.log('-----------------------------------------\n');

    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. Store this token securely');
    console.log('   2. DO NOT commit this token to git');
    console.log('   3. This token has FULL admin access');
    console.log('   4. Regenerate if compromised\n');

    console.log('✅ Super Admin setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
