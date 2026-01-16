import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import { Database, users, socialAccounts } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { AuthTokens, JwtPayload } from '../auth/interfaces';
import { JWT_CONSTANTS } from '@ai-job-portal/common';

export interface SocialProfile {
  provider: 'google' | 'linkedin';
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleSocialLogin(profile: SocialProfile, role: 'candidate' | 'employer' = 'candidate'): Promise<AuthTokens> {
    // Check if social account exists
    const existingSocialAccount = await this.db.query.socialAccounts.findFirst({
      where: and(
        eq(socialAccounts.provider, profile.provider),
        eq(socialAccounts.providerId, profile.providerId),
      ),
    });

    let userId: string;

    if (existingSocialAccount) {
      userId = existingSocialAccount.userId;
    } else {
      // Check if user with email exists
      let user = await this.db.query.users.findFirst({
        where: eq(users.email, profile.email.toLowerCase()),
      });

      if (!user) {
        // Create new user
        const [newUser] = await this.db.insert(users).values({
          email: profile.email.toLowerCase(),
          role,
          isEmailVerified: true, // OAuth emails are considered verified
        } as any).returning({ id: users.id });
        userId = newUser.id;
      } else {
        userId = user.id;
      }

      // Link social account
      await this.db.insert(socialAccounts).values({
        userId,
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        avatarUrl: profile.avatarUrl,
      });
    }

    // Get user for token generation
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return this.generateTokens(userId, user!.email, user!.role);
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: JWT_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
