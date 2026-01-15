/**
 * DEV ONLY - Development Seed Script - Generate Fixed DEV Users and Tokens
 *
 * Purpose: Create long-lived (60-day) JWT tokens for development
 * Usage: npx tsx scripts/dev-seed-users.ts
 * cd apps/auth-service
 * npx ts-node -r tsconfig-paths/register scripts/dev-seed-users.ts
 *
 * IMPORTANT:
 * - DEV ONLY - Only runs in development environment
 * - Creates 6 users (3 developers × 2 roles)
 * - Generates valid JWT tokens using real AuthService
 * - DO NOT commit generated tokens to git
 */

import {NestFactory} from '@nestjs/core';
import {ConfigService} from '@nestjs/config';
import {JwtService} from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {nanoid} from 'nanoid';
import {eq} from 'drizzle-orm';
import {AppModule} from '../src/app.module';
import {DatabaseService} from '../src/database/database.service';
import {users, employers, profiles} from '@ai-job-portal/database';
import {UserRole} from '@ai-job-portal/common';
import {SessionService} from '../src/session/services/session.service';

interface DevUser {
  developer: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

const DEV_USERS: DevUser[] = [
  {
    developer: 'FE1',
    role: UserRole.CANDIDATE,
    email: 'fe1abee.candidate@dev.local',
    firstName: 'FE1',
    lastName: 'Candidate',
  },
  {
    developer: 'FE1',
    role: UserRole.EMPLOYER,
    email: 'fe1abee.employer@dev.local',
    firstName: 'FE1',
    lastName: 'Employer',
    companyName: 'FE1 Test Company',
  },
  {
    developer: 'FE2',
    role: UserRole.CANDIDATE,
    email: 'fe2deep.candidate@dev.local',
    firstName: 'FE2',
    lastName: 'Candidate',
  },
  {
    developer: 'FE2',
    role: UserRole.EMPLOYER,
    email: 'fe2deep.employer@dev.local',
    firstName: 'FE2',
    lastName: 'Employer',
    companyName: 'FE2 Test Company',
  },
  {
    developer: 'BE',
    role: UserRole.CANDIDATE,
    email: 'bekrishh.candidate@dev.local',
    firstName: 'BE',
    lastName: 'Candidate',
  },
  {
    developer: 'BE',
    role: UserRole.EMPLOYER,
    email: 'bekrishh.employer@dev.local',
    firstName: 'BE',
    lastName: 'Employer',
    companyName: 'BE Test Company',
  },
];

const DEV_PASSWORD = 'DevTest@2026';

async function bootstrap() {
  console.log('🚀 Starting DEV users and tokens generation...\n');

  // Environment check
  if (process.env.NODE_ENV !== 'development') {
    console.error('❌ ERROR: This script can only run in development environment');
    console.error(`   Current NODE_ENV: ${process.env.NODE_ENV}`);
    process.exit(1);
  }

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get services
  const databaseService = app.get(DatabaseService);
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const sessionService = app.get(SessionService);

  const bcryptRounds = configService.get<number>('app.security.bcryptRounds') || 10;
  const hashedPassword = await bcrypt.hash(DEV_PASSWORD, bcryptRounds);

  const tokens: Record<string, string> = {};

  console.log('📝 Creating users and generating tokens...\n');

  for (const devUser of DEV_USERS) {
    try {
      // Check if user exists
      const [existingUser] = await databaseService.db
        .select()
        .from(users)
        .where(eq(users.email, devUser.email))
        .limit(1);

      let user = existingUser;

      if (!existingUser) {
        // Create new user
        const [newUser] = await databaseService.db
          .insert(users)
          .values({
            firstName: devUser.firstName,
            lastName: devUser.lastName,
            email: devUser.email,
            password: hashedPassword,
            mobile: '+1234567890', // Dummy mobile
            role: devUser.role,
            isVerified: true, // Mark as verified for development
            isMobileVerified: true,
            isActive: true,
          })
          .returning();

        user = newUser;
        console.log(`✅ Created user: ${devUser.email}`);
      } else {
        console.log(`ℹ️  User already exists: ${devUser.email}`);
      }

      // Create employer profile if role is employer
      if (devUser.role === UserRole.EMPLOYER && devUser.companyName) {
        const [existingEmployer] = await databaseService.db
          .select()
          .from(employers)
          .where(eq(employers.userId, user.id))
          .limit(1);

        if (!existingEmployer) {
          await databaseService.db.insert(employers).values({
            userId: user.id,
            companyName: devUser.companyName,
            isVerified: true, // Verified for development
            subscriptionPlan: 'free',
          });
          console.log(`   ✅ Created employer profile: ${devUser.companyName}`);
        } else {
          console.log(`   ℹ️  Employer profile already exists`);
        }
      }

      // Create candidate profile if role is candidate
      if (devUser.role === UserRole.CANDIDATE) {
        const [existingProfile] = await databaseService.db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, user.id))
          .limit(1);

        if (!existingProfile) {
          await databaseService.db.insert(profiles).values({
            userId: user.id,
            firstName: devUser.firstName,
            lastName: devUser.lastName,
            phone: '+1234567890', // Dummy phone
            email: user.email,
            visibility: 'public', // Make profile visible
            completionPercentage: 0,
            isProfileComplete: false,
          });
          console.log(`   ✅ Created candidate profile`);
        } else {
          console.log(`   ℹ️  Candidate profile already exists`);
        }
      }

      // Clean up any existing sessions for this user to avoid conflicts
      await sessionService.deleteAllUserSessions(user.id);
      console.log(`   🧹 Cleaned up existing sessions`);

      // Create session (required for token generation)
      const session = await sessionService.createSessionWithoutTokens(
        user.id,
        '127.0.0.1', // Dev IP
        'DevSeedScript/1.0', // User agent
      );
      console.log(`   📝 Created session ID: ${session.id}`);

      // Generate JWT token
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id,
      };

      const accessTokenExpiration = configService.get<string>('app.jwt.accessTokenExpiration');
      const accessToken = jwtService.sign(payload, {
        expiresIn: accessTokenExpiration, // Will be 60d in development
      });

      // Update session with real token
      await sessionService.updateSessionTokens(
        session.id,
        accessToken,
        `dev-refresh-${nanoid()}`, // Unique refresh token to avoid constraint violations
      );

      // Store token
      const label = `${devUser.developer} ${devUser.role === UserRole.CANDIDATE ? 'Candidate' : 'Employer'}`;
      tokens[label] = accessToken;

      console.log(`   ✅ Generated ${accessTokenExpiration} token\n`);
    } catch (error) {
      console.error(`❌ Error processing ${devUser.email}:`, error);
    }
  }

  // Output tokens in the required format
  console.log('\n' + '='.repeat(50));
  console.log('DEV TOKENS');
  console.log('='.repeat(50) + '\n');

  for (const [label, token] of Object.entries(tokens)) {
    console.log(`${label}:`);
    console.log(`Bearer ${token}\n`);
  }

  console.log('='.repeat(50));
  console.log('\n💡 Copy the token for your role and paste in Swagger "Authorize" button');
  console.log('⏰ Tokens expire in 60 days');
  console.log('🔒 Do NOT commit these tokens to git\n');

  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
