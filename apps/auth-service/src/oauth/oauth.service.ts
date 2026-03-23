import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq, and, isNotNull } from 'drizzle-orm';
import {
  Database,
  users,
  socialLogins,
  sessions,
  profiles,
  employers,
  companies,
} from '@ai-job-portal/database';
import { CognitoService, SqsService, S3Service } from '@ai-job-portal/aws';
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

  private readonly GOOGLE_PHOTO_ALLOWED_HOSTS = new Set([
    'lh3.googleusercontent.com',
    'lh4.googleusercontent.com',
    'lh5.googleusercontent.com',
    'lh6.googleusercontent.com',
  ]);

  private readonly ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cognitoService: CognitoService,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
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

    const [profilePhoto, company] = await Promise.all([
      this.getProfilePhotoForUser(user!.id, user!.role),
      this.getCompanyInfoForUser(user!.id, user!.role),
    ]);

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
          company,
          profilePhoto,
          isVerified: user!.isVerified || false,
          isMobileVerified: user!.isMobileVerified || false,
          onboardingStep: user!.onboardingStep || 0,
          isOnboardingCompleted: user!.isOnboardingCompleted || false,
        },
      },
    };
  }

  /**
   * Handle Google Sign-In from native mobile apps.
   * Verifies the Google ID token via Google's tokeninfo endpoint,
   * then creates/finds user and returns app auth tokens.
   */
  async handleGoogleNativeLogin(idToken: string, role: 'candidate' | 'employer') {
    // Verify the Google ID token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Google token verification failed: ${error}`);
      throw new Error('Invalid Google ID token');
    }

    const payload = (await response.json()) as Record<string, string>;

    // Verify the audience matches our Google client ID
    const expectedClientId = this.configService.get('GOOGLE_CLIENT_ID');
    if (expectedClientId && payload.aud !== expectedClientId) {
      throw new Error('Google ID token audience mismatch');
    }

    this.logger.log(`Google Native Login: ${payload.email} (sub: ${payload.sub})`);

    const profile: SocialProfile = {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      avatarUrl: payload.picture,
    };

    const authTokens = await this.handleSocialLogin(profile, role);

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, authTokens.userId),
    });

    const [profilePhoto, company] = await Promise.all([
      this.getProfilePhotoForUser(user!.id, user!.role),
      this.getCompanyInfoForUser(user!.id, user!.role),
    ]);

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
          company,
          profilePhoto,
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
        this.sqsService
          .sendWelcomeNotification({
            userId,
            email: profile.email.toLowerCase(),
            firstName: profile.firstName || 'User',
            role,
          })
          .catch((err) => this.logger.error(`Failed to queue welcome email: ${err.message}`));
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

  /**
   * Download an external image URL and upload it to S3.
   * Returns the S3 key on success, or null if download/upload fails.
   */
  private async downloadAndStoreProfilePhoto(
    avatarUrl: string,
    userId: string,
  ): Promise<string | null> {
    try {
      // SSRF: validate hostname against allowlist before fetching
      let parsed: URL;
      try {
        parsed = new URL(avatarUrl);
      } catch {
        this.logger.warn(`Invalid avatar URL for user ${userId}`);
        return null;
      }
      if (!this.GOOGLE_PHOTO_ALLOWED_HOSTS.has(parsed.hostname)) {
        this.logger.warn(`Rejected avatar URL with untrusted host: ${parsed.hostname}`);
        return null;
      }

      // Fetch with 5s timeout to prevent login hangs
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      let response: Response;
      try {
        response = await fetch(avatarUrl, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        this.logger.warn(
          `Failed to download profile photo for user ${userId}: HTTP ${response.status}`,
        );
        return null;
      }

      // Allowlist specific safe types — rejects SVG and other dangerous formats
      const rawContentType = response.headers.get('content-type') || '';
      const contentType = rawContentType.split(';')[0].trim();
      if (!this.ALLOWED_IMAGE_TYPES.has(contentType)) {
        this.logger.warn(`Rejected profile photo content-type for user ${userId}: ${contentType}`);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Skip if image is too large (2MB limit, same as candidate upload)
      if (buffer.length > 2 * 1024 * 1024) {
        this.logger.warn(`Profile photo too large for user ${userId}: ${buffer.length} bytes`);
        return null;
      }

      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg';
      // Deterministic key — overwrites on re-login, no orphaned files accumulate
      const key = `profile-photos/google-${userId}.${ext}`;
      await this.s3Service.upload(key, buffer, contentType);

      this.logger.log(`Stored Google profile photo to S3 for user ${userId}: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to download/store profile photo for user ${userId}: ${error}`);
      return null;
    }
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
          // Download Google photo to S3 instead of storing external URL
          let profilePhotoKey: string | null = null;
          if (profile.avatarUrl) {
            profilePhotoKey = await this.downloadAndStoreProfilePhoto(profile.avatarUrl, userId);
          }

          await this.db.insert(profiles).values({
            userId,
            firstName: profile.firstName || 'User',
            lastName: profile.lastName || '',
            email: profile.email.toLowerCase(),
            phone: '',
            visibility: 'public',
            isProfileComplete: false,
            completionPercentage: 0,
            profilePhoto: profilePhotoKey,
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
          // Download Google photo to S3 instead of storing expiring external URL
          let profilePhotoKey: string | null = null;
          if (profile.avatarUrl) {
            profilePhotoKey = await this.downloadAndStoreProfilePhoto(profile.avatarUrl, userId);
          }

          await this.db.insert(employers).values({
            userId,
            isVerified: false,
            subscriptionPlan: 'free' as const,
            firstName: profile.firstName || 'User',
            lastName: profile.lastName || '',
            email: profile.email.toLowerCase(),
            phone: '',
            visibility: true,
            profilePhoto: profilePhotoKey,
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

  private async getProfilePhotoForUser(userId: string, role: string): Promise<string | null> {
    if (role === 'employer' || role === 'super_employer') {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
        columns: { profilePhoto: true },
      });
      return this.s3Service.getPublicUrlFromKeyOrUrl(employer?.profilePhoto || null);
    }

    if (role === 'candidate') {
      const profile = await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: { profilePhoto: true },
      });
      return this.s3Service.getPublicUrlFromKeyOrUrl(profile?.profilePhoto || null);
    }

    return null;
  }

  private async getCompanyInfoForUser(
    userId: string,
    role: string,
  ): Promise<{ id: string; name: string; logoUrl: string | null; slug: string } | null> {
    if (role !== 'employer' && role !== 'super_employer') {
      return null;
    }

    const rows = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        slug: companies.slug,
      })
      .from(employers)
      .innerJoin(companies, eq(companies.id, employers.companyId))
      .where(and(eq(employers.userId, userId), isNotNull(employers.companyId)))
      .limit(1);

    return rows[0] || null;
  }
}
