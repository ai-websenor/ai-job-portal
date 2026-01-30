/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { Database, users, sessions, employers, profiles, otps } from '@ai-job-portal/database';
import { CognitoService, CognitoAuthResult, SnsService } from '@ai-job-portal/aws';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { CACHE_CONSTANTS } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerifyEmailOtpDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  AuthResponseDto,
  MessageResponseDto,
  VerifyMobileDto,
  ChangePasswordDto,
  SuperAdminLoginDto,
  SuperAdminLoginResponseDto,
} from './dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cognitoService: CognitoService,
    private readonly snsService: SnsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ userId: string; message: string; verificationCode?: string }> {
    // Check if email exists in local DB
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Register with Cognito - handles password hashing and email verification
    const cognitoResult = await this.cognitoService.signUp(dto.email, dto.password, {
      givenName: dto.firstName,
      familyName: dto.lastName,
      phoneNumber: dto.mobile,
    });

    // In development mode, generate a dev verification code
    const isDev = this.configService.get('NODE_ENV') !== 'production';
    const devVerificationCode = isDev ? '123456' : undefined;

    // Store dev code in Redis for verification
    if (isDev && devVerificationCode) {
      await this.redis.setex(
        `${CACHE_CONSTANTS.OTP_PREFIX}verify:${dto.email.toLowerCase()}`,
        CACHE_CONSTANTS.OTP_TTL,
        devVerificationCode,
      );
    }

    // Create local user (no password stored - Cognito handles auth)
    const [user] = await this.db
      .insert(users)
      .values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        password: '', // Empty - Cognito handles passwords
        mobile: dto.mobile,
        role: dto.role,
        cognitoSub: cognitoResult.userSub,
      })
      .returning({ id: users.id });

    // Auto-create employer profile for employer role
    if (dto.role === 'employer') {
      try {
        const existingEmployer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, user.id),
        });

        if (!existingEmployer) {
          await this.db.insert(employers).values({
            userId: user.id,
            isVerified: false,
            subscriptionPlan: 'free' as const,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email.toLowerCase(),
            phone: dto.mobile,
            visibility: true,
          });
        }
      } catch (error) {
        this.logger.error('Failed to create employer profile', error);
      }
    }

    // Auto-create candidate profile for candidate role
    if (dto.role === 'candidate') {
      try {
        const existingProfile = await this.db.query.profiles.findFirst({
          where: eq(profiles.userId, user.id),
        });

        if (!existingProfile) {
          await this.db.insert(profiles).values({
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email.toLowerCase(),
            phone: dto.mobile,
            visibility: 'public',
            isProfileComplete: false,
            completionPercentage: 0,
          });
        }
      } catch (error) {
        this.logger.error('Failed to create candidate profile', error);
      }
    }

    this.logger.log(`User registered: ${user.id}, Cognito sub: ${cognitoResult.userSub}`);

    const response: { userId: string; message: string; verificationCode?: string } = {
      userId: user.id,
      message: 'Registration successful. Please check your email to verify your account.',
    };

    // Include dev verification code in response (only in non-production)
    if (devVerificationCode) {
      response.verificationCode = devVerificationCode;
      response.message =
        'Registration successful. Use the verificationCode to verify your email (dev mode).';
    }

    return response;
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Authenticate with Cognito
    let cognitoAuth: CognitoAuthResult;
    try {
      cognitoAuth = await this.cognitoService.signIn(dto.email, dto.password);
    } catch (error: any) {
      if (error.name === 'UserNotConfirmedException') {
        throw new UnauthorizedException('Please verify your email before logging in');
      }
      if (error.name === 'NotAuthorizedException') {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException('Authentication failed');
    }

    // Get local user for profile data
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (!user) {
      // User exists in Cognito but not locally - sync from Cognito
      const cognitoUser = await this.cognitoService.getUser(cognitoAuth.accessToken);
      const [newUser] = await this.db
        .insert(users)
        .values({
          firstName: cognitoUser.givenName || '',
          lastName: cognitoUser.familyName || '',
          email: dto.email.toLowerCase(),
          password: '',
          mobile: cognitoUser.phoneNumber || '',
          role: 'candidate',
          cognitoSub: cognitoUser.sub,
          isVerified: true,
        })
        .returning();

      return this.buildAuthResponse(cognitoAuth, newUser);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Resend email verification OTP if user is not verified (best-effort, non-blocking)
    if (!user.isVerified) {
      try {
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        const otp = isDev ? '123456' : generateOtp();

        console.log('Login - Resending email verification OTP>>', otp);

        await this.redis.setex(
          `${CACHE_CONSTANTS.OTP_PREFIX}${user.id}:email`,
          CACHE_CONSTANTS.OTP_TTL,
          otp,
        );

        // TODO: Send verification email via SES
      } catch (error) {
        // Log error but don't fail login - OTP sending is best-effort
        console.error('Failed to resend email verification OTP on login:', error);
      }
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.isVerified,
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        userId: user.id,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        mobile: user.mobile || '',
        isVerified: user.isVerified || false,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    // Get user from session
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.token, dto.refreshToken),
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Refresh with Cognito
    // Use cognitoSub for SECRET_HASH calculation (Cognito uses this as username internally)
    try {
      const cognitoAuth = await this.cognitoService.refreshToken(
        dto.refreshToken,
        user.cognitoSub || user.email, // Try cognitoSub first, fall back to email
      );

      // Delete old session
      await this.db.delete(sessions).where(eq(sessions.id, session.id));

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.isVerified,
        user.isMobileVerified,
        user.onboardingStep || 0,
        user.isOnboardingCompleted || false,
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          userId: user.id,
          role: user.role,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          mobile: user.mobile || '',
          isVerified: user.isVerified || false,
          isMobileVerified: user.isMobileVerified || false,
          onboardingStep: user.onboardingStep || 0,
          isOnboardingCompleted: user.isOnboardingCompleted || false,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.db.delete(sessions).where(eq(sessions.token, refreshToken));
    } else {
      await this.db.delete(sessions).where(eq(sessions.userId, userId));
    }

    await this.redis.del(`${CACHE_CONSTANTS.USER_PREFIX}${userId}`);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    const isDev = this.configService.get('NODE_ENV') !== 'production';

    // In dev mode, check for dev verification code in Redis first
    if (isDev) {
      const devCode = await this.redis.get(
        `${CACHE_CONSTANTS.OTP_PREFIX}verify:${dto.email.toLowerCase()}`,
      );

      if (devCode && devCode === dto.code) {
        // Dev code matches - use admin confirm to bypass Cognito email verification
        try {
          await this.cognitoService.adminConfirmSignUp(dto.email);
          // Delete the dev code from Redis
          await this.redis.del(`${CACHE_CONSTANTS.OTP_PREFIX}verify:${dto.email.toLowerCase()}`);
        } catch (error: any) {
          this.logger.error('Admin confirm signup failed', error);
          throw new BadRequestException('Email verification failed');
        }
      } else {
        // Try Cognito verification as fallback
        try {
          await this.cognitoService.confirmSignUp(dto.email, dto.code);
        } catch (error: any) {
          if (error.name === 'CodeMismatchException') {
            throw new BadRequestException('Invalid verification code');
          }
          if (error.name === 'ExpiredCodeException') {
            throw new BadRequestException('Verification code has expired');
          }
          throw new BadRequestException('Email verification failed');
        }
      }
    } else {
      // Production mode - use Cognito verification
      try {
        await this.cognitoService.confirmSignUp(dto.email, dto.code);
      } catch (error: any) {
        if (error.name === 'CodeMismatchException') {
          throw new BadRequestException('Invalid verification code');
        }
        if (error.name === 'ExpiredCodeException') {
          throw new BadRequestException('Verification code has expired');
        }
        throw new BadRequestException('Email verification failed');
      }
    }

    // Update local user
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.db.update(users).set({ isVerified: true }).where(eq(users.id, user.id));

    // User needs to login with password after verification
    return {
      message: 'Email verified successfully. Please login with your password.',
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
      user: {
        userId: user.id,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        mobile: user.mobile || '',
        isVerified: true,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    // Initiate forgot password with Cognito
    try {
      await this.cognitoService.forgotPassword(dto.email);
    } catch (error: any) {
      // Don't reveal if user exists
      this.logger.warn(`Forgot password attempt for unknown email: ${dto.email}`);
    }

    // Always return same message (don't reveal if email exists)
    return {
      message: 'If email exists, reset instructions have been sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Confirm forgot password with Cognito
    try {
      await this.cognitoService.confirmForgotPassword(dto.email, dto.code, dto.newPassword);
    } catch (error: any) {
      if (error.name === 'CodeMismatchException') {
        throw new BadRequestException('Invalid reset code');
      }
      if (error.name === 'ExpiredCodeException') {
        throw new BadRequestException('Reset code has expired');
      }
      if (error.name === 'InvalidPasswordException') {
        throw new BadRequestException('Password does not meet requirements');
      }
      throw new BadRequestException('Password reset failed');
    }

    // Invalidate all local sessions
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (user) {
      await this.db.delete(sessions).where(eq(sessions.userId, user.id));
    }

    return { message: 'Password reset successful' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    try {
      await this.cognitoService.resendConfirmationCode(email);
    } catch (error: any) {
      // Don't reveal if user exists or is already verified
      this.logger.warn(`Resend verification attempt: ${email}`);
    }

    return { message: 'If email exists and is not verified, verification code has been sent' };
  }

  async resendVerifyEmailOtp(dto: ResendVerifyEmailOtpDto): Promise<MessageResponseDto> {
    return this.resendVerification(dto.email);
  }

  async sendMobileOtp(userId: string): Promise<MessageResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User not found or inactive');
    }

    if (!user.mobile) {
      throw new BadRequestException('No mobile number registered');
    }

    if (user.isMobileVerified) {
      return { message: 'Mobile already verified' };
    }

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // Store in DB with 10-min expiry
    await this.db.insert(otps).values({
      userId: user.id,
      otp,
      purpose: 'mobile_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send via SNS
    try {
      await this.snsService.sendOtp(user.mobile, otp);
      this.logger.log(`OTP sent to ${user.mobile}`);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP: ${error.message}`);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }

    return { message: 'OTP sent to your mobile number' };
  }

  async verifyMobile(userId: string, dto: VerifyMobileDto): Promise<MessageResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User not found or inactive');
    }

    if (user.isMobileVerified) {
      return { message: 'Mobile already verified' };
    }

    // Find valid OTP from database
    const otpRecord = await this.db.query.otps.findFirst({
      where: and(
        eq(otps.userId, userId),
        eq(otps.otp, dto.otp),
        eq(otps.purpose, 'mobile_verification'),
        isNull(otps.verifiedAt),
        gt(otps.expiresAt, new Date()),
      ),
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.db.update(otps).set({ verifiedAt: new Date() }).where(eq(otps.id, otpRecord.id));

    // Update user mobile verified status
    await this.db.update(users).set({ isMobileVerified: true }).where(eq(users.id, user.id));

    this.logger.log(`Mobile verified for user: ${user.id}`);

    return { message: 'Mobile verified successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User not found or inactive');
    }

    if (!user.password) {
      throw new BadRequestException('Cannot change password for OAuth-only accounts');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Invalid current password');
    }

    // Ensure new password is different from current password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password in database
    await this.db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));

    // Invalidate all sessions (force logout from all devices)
    await this.db.delete(sessions).where(eq(sessions.userId, userId));

    // Invalidate cached user data
    await this.redis.del(`${CACHE_CONSTANTS.USER_PREFIX}${userId}`);

    return { message: 'Password changed successfully' };
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
    };
  }

  private async buildAuthResponse(
    cognitoAuth: CognitoAuthResult,
    user: any,
  ): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.isVerified,
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: cognitoAuth.refreshToken,
      expiresIn: cognitoAuth.expiresIn,
      user: {
        userId: user.id,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        mobile: user.mobile || '',
        isVerified: user.isVerified || false,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
    };
  }

  async superAdminLogin(dto: SuperAdminLoginDto): Promise<SuperAdminLoginResponseDto> {
    const SUPER_ADMIN_EMAIL = 'jobboardsuperadmin@gmail.com';
    const SUPER_ADMIN_PASSWORD = 'Superadmin@1234';

    if (dto.email !== SUPER_ADMIN_EMAIL || dto.password !== SUPER_ADMIN_PASSWORD) {
      throw new UnauthorizedException('Invalid super admin credentials');
    }

    // Generate a non-expiring token for super admin
    const payload: JwtPayload = {
      sub: 'super-admin',
      email: SUPER_ADMIN_EMAIL,
      role: 'super_admin',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '100y', // Effectively non-expiring
    });

    return {
      accessToken,
      expiresIn: 'never',
      user: {
        userId: 'super-admin',
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
        email: SUPER_ADMIN_EMAIL,
        mobile: '',
        isVerified: true,
        isMobileVerified: false,
        onboardingStep: 0,
        isOnboardingCompleted: true,
      },
    };
  }
}
