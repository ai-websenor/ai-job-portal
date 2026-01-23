import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import { Database, users, socialLogins, sessions } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { AuthTokens, JwtPayload } from '../auth/interfaces';

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
      user!.isMobileVerified,
      user!.onboardingStep || 0,
      user!.isOnboardingCompleted || false,
    );
  }

  /**
   * Convert JWT expiry string (e.g., '15m', '7d', '365d') to seconds
   */
  private convertExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    isVerified: boolean = false,
    isMobileVerified: boolean = false,
    onboardingStep: number = 0,
    isOnboardingCompleted: boolean = false,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessTokenExpiry = this.configService.get('JWT_ACCESS_EXPIRY') || '365d';
    const refreshTokenExpiry = this.configService.get('JWT_REFRESH_EXPIRY') || '365d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: refreshTokenExpiry,
    });

    // Store session with expiry matching or exceeding refresh token expiry
    const refreshExpirySeconds = this.convertExpiryToSeconds(refreshTokenExpiry);
    const expiresAt = new Date(Date.now() + refreshExpirySeconds * 1000);
    await this.db.insert(sessions).values({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.convertExpiryToSeconds(accessTokenExpiry),
      userId,
      isVerified,
      isMobileVerified,
      onboardingStep,
      isOnboardingCompleted,
    };
  }
}
