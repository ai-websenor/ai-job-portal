import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import {
  Database,
  users,
  socialLogins,
  sessions,
  profiles,
  employers,
} from '@ai-job-portal/database';
import { CognitoService, SqsService } from '@ai-job-portal/aws';
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
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cognitoService: CognitoService,
    private readonly sqsService: SqsService,
  ) {}

  /**
   * Returns the Cognito Hosted UI URL for Google OAuth login
   */
  getGoogleAuthUrl(redirectUri: string, role: string) {
    const url = this.cognitoService.getAuthorizationUrl('Google', redirectUri);

    // Append state param with role so we can use it in callback
    const stateParam = `&state=${encodeURIComponent(JSON.stringify({ role }))}`;

    return { url: url + stateParam };
  }

  /**
   * Exchange Cognito authorization code for tokens, parse ID token,
   * create/find user, and return app auth tokens
   */
  async handleCognitoGoogleCallback(
    code: string,
    redirectUri: string,
    role: 'candidate' | 'employer',
  ) {
    // Exchange authorization code for Cognito tokens
    const cognitoTokens = await this.cognitoService.exchangeCodeForTokens(code, redirectUri);

    // Parse the ID token to get user info (sub, email, name, picture)
    const idTokenPayload = this.cognitoService.parseIdToken(cognitoTokens.idToken);

    this.logger.log(`Google OAuth: ${idTokenPayload.email} (sub: ${idTokenPayload.sub})`);

    // Build social profile and run through existing handleSocialLogin logic
    const profile: SocialProfile = {
      provider: 'google',
      providerId: idTokenPayload.sub,
      email: idTokenPayload.email,
      firstName: idTokenPayload.givenName,
      lastName: idTokenPayload.familyName,
      avatarUrl: idTokenPayload.picture,
    };

    const authTokens = await this.handleSocialLogin(profile, role);

    // Fetch full user for response
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, authTokens.userId),
    });

    return {
      message: 'Login successful',
      data: {
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
        expiresIn: authTokens.expiresIn,
        user: {
          userId: user!.id,
          role: user!.role,
          firstName: user!.firstName || '',
          lastName: user!.lastName || '',
          email: user!.email,
          mobile: user!.mobile || '',
          isVerified: user!.isVerified || false,
          isMobileVerified: user!.isMobileVerified || false,
          onboardingStep: user!.onboardingStep || 0,
          isOnboardingCompleted: user!.isOnboardingCompleted || false,
        },
      },
    };
  }

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
    let isNewUser = false;

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
        isNewUser = true;
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

      // Auto-create profile for new users
      if (isNewUser) {
        await this.ensureProfileExists(userId, profile, role);

        // Send welcome email (non-blocking)
        this.sqsService.sendWelcomeNotification({
          userId,
          email: profile.email.toLowerCase(),
          firstName: profile.firstName || 'User',
          role,
        }).catch((err) => this.logger.error(`Failed to queue welcome email: ${err.message}`));
      }
    }

    // Get user for token generation
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Ensure profile exists for all users (handles migration case)
    if (user) {
      await this.ensureProfileExists(userId, profile, user.role as 'candidate' | 'employer');
    }

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

  private async ensureProfileExists(
    userId: string,
    profile: SocialProfile,
    role: 'candidate' | 'employer',
  ): Promise<void> {
    if (role === 'candidate') {
      try {
        const existingProfile = await this.db.query.profiles.findFirst({
          where: eq(profiles.userId, userId),
        });

        if (!existingProfile) {
          await this.db.insert(profiles).values({
            userId,
            firstName: profile.firstName || 'User',
            lastName: profile.lastName || '',
            email: profile.email.toLowerCase(),
            phone: '',
            visibility: 'public',
            isProfileComplete: false,
            completionPercentage: 0,
            profilePhoto: profile.avatarUrl,
          });
          this.logger.log(`Created candidate profile for OAuth user: ${userId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create candidate profile for OAuth user: ${userId}`, error);
      }
    }

    if (role === 'employer') {
      try {
        const existingEmployer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, userId),
        });

        if (!existingEmployer) {
          await this.db.insert(employers).values({
            userId,
            isVerified: false,
            subscriptionPlan: 'free' as const,
            firstName: profile.firstName || 'User',
            lastName: profile.lastName || '',
            email: profile.email.toLowerCase(),
            phone: '',
            visibility: true,
            profilePhoto: profile.avatarUrl,
          });
          this.logger.log(`Created employer profile for OAuth user: ${userId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create employer profile for OAuth user: ${userId}`, error);
      }
    }
  }

  private convertExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900;

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
