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
} from './dto';

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

  async register(dto: RegisterDto): Promise<{ userId: string; message: string }> {
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

    return {
      userId: user.id,
      message: 'Registration successful. Please check your email to verify your account.',
    };
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

    // Update last login and sync isVerified from Cognito
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), isVerified: true })
      .where(eq(users.id, user.id));

    // Store session for tracking
    await this.db.insert(sessions).values({
      userId: user.id,
      token: cognitoAuth.refreshToken,
      expiresAt: new Date(Date.now() + cognitoAuth.expiresIn * 1000),
    });

    return this.buildAuthResponse(cognitoAuth, user);
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

      // Create new session
      await this.db.insert(sessions).values({
        userId: user.id,
        token: cognitoAuth.refreshToken,
        expiresAt: new Date(Date.now() + cognitoAuth.expiresIn * 1000),
      });

      return this.buildAuthResponse(cognitoAuth, user);
    } catch (error: any) {
      this.logger.error(`Cognito refresh failed: ${error.name} - ${error.message}`);
      throw new UnauthorizedException('Failed to refresh token');
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
    // Confirm signup with Cognito
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
    await this.db
      .update(otps)
      .set({ verifiedAt: new Date() })
      .where(eq(otps.id, otpRecord.id));

    // Update user mobile verified status
    await this.db
      .update(users)
      .set({ isMobileVerified: true })
      .where(eq(users.id, user.id));

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

    // For Cognito users, password change requires current session
    // This endpoint is called with authenticated user, so we can use their email
    // But we need access token - which isn't passed here

    // Workaround: Use forgotPassword flow for password change
    // Or require user to use Cognito's change password with access token

    throw new BadRequestException(
      'Password change requires re-authentication. Please use forgot password flow.',
    );
  }

  private buildAuthResponse(
    cognitoAuth: CognitoAuthResult,
    user: typeof users.$inferSelect,
  ): AuthResponseDto {
    // Mint internal HS256 JWT with proper claims for downstream services
    // This bridges Cognito RS256 tokens to our internal HS256 format
    const accessToken = this.jwtService.sign(
      {
        sub: user.id, // Local user ID (not Cognito sub)
        email: user.email,
        role: user.role,
      },
      {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
      },
    );

    return {
      accessToken, // Internal HS256 token (works with all services)
      refreshToken: cognitoAuth.refreshToken, // Keep Cognito refresh token
      expiresIn: cognitoAuth.expiresIn,
      user: {
        userId: user.id,
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
}
