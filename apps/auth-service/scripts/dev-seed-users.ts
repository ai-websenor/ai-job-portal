import * as dotenv from 'dotenv';
import * as path from 'path';
// Explicitly point to .env in apps/auth-service root
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
import {
  createDatabaseClient,
  users,
  sessions,
  profiles,
  companies,
  employers,
} from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Ensure we are in a safe environment
if (process.env.NODE_ENV === 'production') {
  console.error('❌ FATAL: This script cannot run in production!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is missing from environment!');
  process.exit(1);
}

// Database Connection
const db = createDatabaseClient(process.env.DATABASE_URL!);

const PASSWORD = 'DevTest@2026';

const DEV_USERS = [
  { email: 'fe1abee.candidate@dev.local', role: 'candidate', name: 'FE1 Candidate' },
  {
    email: 'fe1abee.employer@dev.local',
    role: 'employer',
    company: 'FE1 Test Company',
    name: 'FE1 Employer',
  },
  { email: 'fe2deep.candidate@dev.local', role: 'candidate', name: 'FE2 Candidate' },
  {
    email: 'fe2deep.employer@dev.local',
    role: 'employer',
    company: 'FE2 Test Company',
    name: 'FE2 Employer',
  },
  { email: 'bekrishh.candidate@dev.local', role: 'candidate', name: 'BE Candidate' },
  {
    email: 'bekrishh.employer@dev.local',
    role: 'employer',
    company: 'BE Test Company',
    name: 'BE Employer',
  },
];

async function seedUsers() {
  console.log('🚀 Starting Dev User Seeding...');
  console.log('Ensure you are in the correct branch!');

  try {
    for (const userConfig of DEV_USERS) {
      console.log(`\n--------------------------------------------------`);
      console.log(`Processing: ${userConfig.email} (${userConfig.role})`);

      // 1. Check if user exists
      let user = await db.query.users.findFirst({
        where: eq(users.email, userConfig.email),
      });

      if (!user) {
        console.log(`- Creating new user...`);
        const hashedPassword = await bcrypt.hash(PASSWORD, 10);
        const [newUser] = await db
          .insert(users)
          .values({
            email: userConfig.email,
            password: hashedPassword,
            firstName: userConfig.name.split(' ')[0],
            lastName: userConfig.name.split(' ')[1] || 'User',
            role: userConfig.role as any,
            mobile: `+91987654321${Math.floor(Math.random() * 10)}`, // Dummy mobile
            isVerified: true,
            isActive: true,
          })
          .returning();
        user = newUser;
      } else {
        console.log(`- User already exists: ${user.id}`);
      }

      // 2. Role Specific Setup
      if (userConfig.role === 'candidate') {
        const existingProfile = await db.query.profiles.findFirst({
          where: eq(profiles.userId, user.id),
        });

        if (!existingProfile) {
          console.log(`- Creating candidate profile...`);
          await db.insert(profiles).values({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            visibility: 'public',
          });
        }
      } else if (userConfig.role === 'employer' && userConfig.company) {
        // Find or create company
        let company = await db.query.companies.findFirst({
          where: eq(companies.name, userConfig.company),
        });

        if (!company) {
          console.log(`- Creating company: ${userConfig.company}...`);
          const slug = userConfig.company.toLowerCase().replace(/ /g, '-');
          const [newCompany] = await db
            .insert(companies)
            .values({
              userId: user.id, // Owner
              name: userConfig.company,
              slug: slug,
              industry: 'Technology',
              companySize: '11-50',
              companyType: 'startup',
              isVerified: true,
              verificationStatus: 'verified',
            })
            .returning();
          company = newCompany;
        }

        // Ensure employer profile exists
        const existingEmployer = await db.query.employers.findFirst({
          where: eq(employers.userId, user.id),
        });

        if (!existingEmployer) {
          console.log(`- Linking user to company...`);
          await db.insert(employers).values({
            userId: user.id,
            companyId: company.id,
            isVerified: true,
          });
        }
      }

      // 3. Session Handling (CRITICAL)
      // Delete ALL existing sessions for this user
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      console.log(`- Cleaned up existing sessions`);

      // Create NEW session FIRST
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const sessionExpiry = new Date();
      sessionExpiry.setDate(sessionExpiry.getDate() + 60); // 60 days

      const [session] = await db
        .insert(sessions)
        .values({
          userId: user.id,
          token: refreshToken, // Store refresh token in DB
          expiresAt: sessionExpiry,
          userAgent: 'DevSeedScript/1.0',
          ipAddress: '127.0.0.1',
        })
        .returning();

      console.log(`- Created session ID: ${session.id}`);

      // 4. Token Generation
      // Payload MUST include sessionId
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id, // ✅ Validation requirement
      };

      const accessToken = jwt.sign(payload, JWT_SECRET!, {
        expiresIn: '60d', // 60 days
      });

      console.log(`- Generated 60d token`);

      // 5. Output
      console.log(`\n${userConfig.role.toUpperCase()}:`);
      console.log(`Bearer ${accessToken}`);
    }

    console.log(`\n✅ Dev User Seeding Completed!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
