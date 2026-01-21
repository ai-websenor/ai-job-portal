import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import { Database, users, socialLogins, sessions } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { AuthTokens, JwtPayload } from '../auth/interfaces';
import { JWT_CONSTANTS, parseDuration } from '@ai-job-portal/common';

export interface SocialProfile {
  provider: 'google' | 'linkedin';
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

@Injectable()
export class OAuthService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleSocialLogin(
    profile: SocialProfile,
    role: 'candidate' | 'employer' = 'candidate',
  ): Promise<AuthTokens> {
    // Check if social login exists
    const existingSocialLogin = await this.db.query.socialLogins.findFirst({
      where: and(
        eq(socialLogins.provider, profile.provider),
        eq(socialLogins.providerId, profile.providerId),
      ),
    });

    let userId: string;

    if (existingSocialLogin) {
      userId = existingSocialLogin.userId;

      // Update tokens if provided
      if (profile.accessToken) {
        await this.db
          .update(socialLogins)
          .set({
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            expiresAt: profile.expiresAt,
          })
          .where(eq(socialLogins.id, existingSocialLogin.id));
      }
    } else {
      // Check if user with email exists
      let user = await this.db.query.users.findFirst({
        where: eq(users.email, profile.email.toLowerCase()),
      });

      if (!user) {
        // Create new user with OAuth profile data
        const [newUser] = await this.db
          .insert(users)
          .values({
            firstName: profile.firstName || 'User',
            lastName: profile.lastName || '',
            email: profile.email.toLowerCase(),
            password: '', // OAuth users don't have a password
            mobile: '', // Will need to be collected later
            role,
            isVerified: true, // OAuth emails are considered verified
          })
          .returning({ id: users.id });
        userId = newUser.id;
      } else {
        userId = user.id;
      }

      // Link social login
      await this.db.insert(socialLogins).values({
        userId,
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        expiresAt: profile.expiresAt,
      });
    }

    // Get user for token generation
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return this.generateTokens(
      userId,
      user!.email,
      user!.role,
      user!.isVerified,
      user!.onboardingStep || 0,
      user!.isOnboardingCompleted || false,
    );
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    isVerified: boolean = false,
    onboardingStep: number = 0,
    isOnboardingCompleted: boolean = false,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: JWT_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });

    // Store session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.db.insert(sessions).values({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: parseDuration(JWT_CONSTANTS.ACCESS_TOKEN_EXPIRY),
      isVerified,
      onboardingStep,
      isOnboardingCompleted,
    };
  }
}
