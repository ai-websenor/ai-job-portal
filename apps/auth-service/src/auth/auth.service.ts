/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import {
  Database,
  users,
  sessions,
  emailVerifications,
  employers,
  profiles,
} from '@ai-job-portal/database';
import { generateOtp, generateToken } from '@ai-job-portal/common';
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
  VerifyForgotPasswordOtpDto,
  ResendVerifyEmailOtpDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  AuthResponseDto,
  ForgotPasswordResponseDto,
  VerifyForgotPasswordResponseDto,
  MessageResponseDto,
  VerifyMobileDto,
  ChangePasswordDto,
} from './dto';
import { AuthTokens, JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; message: string }> {
    // Check if email exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password (bcrypt includes salt in the hash)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with new schema fields
    const [user] = await this.db
      .insert(users)
      .values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        mobile: dto.mobile,
        role: dto.role,
      })
      .returning({ id: users.id });

    // Auto-create employer profile for employer role
    if (dto.role === 'employer') {
      try {
        // Check if employer profile already exists (idempotent)
        const existingEmployer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, user.id),
        });

        if (!existingEmployer) {
          // Create employer profile with optional fields from registration
          await this.db.insert(employers).values({
            userId: user.id,
            isVerified: false,
            subscriptionPlan: 'free' as const,
            // Optional personal fields from registration DTO
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email.toLowerCase(),
            phone: dto.mobile,
            visibility: true,
          });
        }
      } catch (error) {
        // Log error but don't fail registration
        console.error('❌ Failed to create employer profile during registration');
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId: user.id,
          attemptedData: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.mobile,
          },
        });
        // Registration continues successfully even if employer profile creation fails
      }
    }

    // Auto-create candidate profile for candidate role
    if (dto.role === 'candidate') {
      try {
        // Check if candidate profile already exists (idempotent)
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
        // Log error but don't fail registration
        console.error('❌ Failed to create candidate profile during registration');
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId: user.id,
          attemptedData: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.mobile,
          },
        });
        // Registration continues successfully even if profile creation fails
      }
    }

    // Generate verification OTP
    // const otp = generateOtp();
    const otp = '123456';
    console.log('OTP>>', otp);
    await this.redis.setex(
      `${CACHE_CONSTANTS.OTP_PREFIX}${user.id}:email`,
      CACHE_CONSTANTS.OTP_TTL,
      otp,
    );

    // TODO: Send verification email via SES

    return {
      userId: user.id,
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      });

      // Check if session exists (using token field)
      const session = await this.db.query.sessions.findFirst({
        where: eq(sessions.token, dto.refreshToken),
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

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

    // Invalidate cached user data
    await this.redis.del(`${CACHE_CONSTANTS.USER_PREFIX}${userId}`);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    const storedOtp = await this.redis.get(`${CACHE_CONSTANTS.OTP_PREFIX}${dto.userId}:email`);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, dto.userId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.db.update(users).set({ isVerified: true }).where(eq(users.id, dto.userId));

    await this.redis.del(`${CACHE_CONSTANTS.OTP_PREFIX}${dto.userId}:email`);

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      true,
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    return {
      message: 'Email verified successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    const isDev = this.configService.get('NODE_ENV') !== 'production';

    if (!user) {
      // Don't reveal if email exists - return same response
      return {
        message: 'If email exists, reset instructions sent',
        ...(isDev && { otp: '123456' }), // DEV only: return OTP for testing
      };
    }

    // Generate 6-digit OTP (DEV: always "123456")
    const otp = isDev ? '123456' : generateOtp();

    console.log('OTPP>>', otp);

    // Hash OTP before storage for security
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Store hashed OTP in Redis with expiry (10 minutes)
    const otpKey = `${CACHE_CONSTANTS.OTP_PREFIX}${user.email.toLowerCase()}:forgot-password`;
    await this.redis.setex(otpKey, CACHE_CONSTANTS.OTP_TTL, hashedOtp);

    // TODO: Send OTP via email/SMS in production

    return {
      message: 'If email exists, reset instructions sent',
      ...(isDev && { otp }), // DEV only: return OTP for testing
    };
  }

  async forgotPasswordVerify(
    dto: VerifyForgotPasswordOtpDto,
  ): Promise<VerifyForgotPasswordResponseDto> {
    const email = dto.email.toLowerCase();
    const otpKey = `${CACHE_CONSTANTS.OTP_PREFIX}${email}:forgot-password`;

    // Get stored hashed OTP
    const storedHashedOtp = await this.redis.get(otpKey);

    if (!storedHashedOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Verify OTP against stored hash
    const isOtpValid = await bcrypt.compare(dto.otp, storedHashedOtp);

    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Find the user
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // User doesn't exist but OTP was somehow valid - clean up and return generic error
      await this.redis.del(otpKey);
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Invalidate OTP immediately (single-use)
    await this.redis.del(otpKey);

    // Generate reset password token
    const resetPasswordToken = generateToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store the reset token in database
    await this.db.insert(emailVerifications).values({
      userId: user.id,
      token: resetPasswordToken,
      expiresAt,
    });

    return {
      message: 'OTP verified successfully',
      resetPasswordToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Find the verification token
    const verification = await this.db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.token, dto.resetPasswordToken),
    });

    if (!verification || verification.expiresAt < new Date() || verification.verifiedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, verification.userId));

    // Mark token as used (single-use)
    await this.db
      .update(emailVerifications)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    // Invalidate all sessions (logout user from all devices)
    await this.db.delete(sessions).where(eq(sessions.userId, verification.userId));

    return { message: 'Password reset successful' };
  }

  async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = generateOtp();
    await this.redis.setex(
      `${CACHE_CONSTANTS.OTP_PREFIX}${userId}:email`,
      CACHE_CONSTANTS.OTP_TTL,
      otp,
    );

    // TODO: Send verification email via SES

    return { message: 'Verification email sent' };
  }

  async resendVerifyEmailOtp(dto: ResendVerifyEmailOtpDto): Promise<MessageResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    // Email enumeration protection - return same response regardless of user existence
    if (!user) {
      return { message: 'If email exists and is not verified, OTP has been sent' };
    }

    // Already verified - return same generic message (no enumeration)
    if (user.isVerified) {
      return { message: 'If email exists and is not verified, OTP has been sent' };
    }

    const isDev = this.configService.get('NODE_ENV') !== 'production';
    const otp = isDev ? '123456' : generateOtp();

    console.log('Resend verify email OTP>>', otp);

    // Store OTP in Redis (overwrites any existing OTP)
    await this.redis.setex(
      `${CACHE_CONSTANTS.OTP_PREFIX}${user.id}:email`,
      CACHE_CONSTANTS.OTP_TTL,
      otp,
    );

    // TODO: Send verification email via SES

    return { message: 'If email exists and is not verified, OTP has been sent' };
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

    // Fixed OTP for DEV mode
    if (dto.otp !== '123456') {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.db.update(users).set({ isMobileVerified: true }).where(eq(users.id, user.id));

    return { message: 'Mobile verified successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponseDto> {
    // Fetch user by userId
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
      userId,
      isVerified,
      isMobileVerified,
      onboardingStep,
      isOnboardingCompleted,
    };
  }
}
