/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { eq, and, isNull, gt, inArray } from 'drizzle-orm';
import {
  Database,
  users,
  sessions,
  loginHistory,
  employers,
  profiles,
  otps,
  companies,
  rolePermissions,
  permissions,
} from '@ai-job-portal/database';
import {
  CognitoService,
  CognitoAuthResult,
  SnsService,
  SqsService,
  S3Service,
} from '@ai-job-portal/aws';
import { randomInt, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { parsePhoneNumber } from 'libphonenumber-js';
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
  VerifyForgotPasswordOtpDto,
  VerifyForgotPasswordResponseDto,
} from './dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId?: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

/**
 * Parse phone number and extract country code and national number
 * Uses libphonenumber-js for reliable parsing
 * Returns null values if parsing fails (does not block registration)
 */
function parsePhoneDetails(phone: string): {
  countryCode: string | null;
  nationalNumber: string | null;
} {
  try {
    const parsed = parsePhoneNumber(phone);

    if (parsed && parsed.isValid()) {
      const countryCode = `+${parsed.countryCallingCode}`;
      const nationalNumber = parsed.nationalNumber;

      // Phone parsing details logged at debug level only

      return { countryCode, nationalNumber };
    }

    // Phone number not valid — returning nulls
    return { countryCode: null, nationalNumber: null };
  } catch (error) {
    // Phone parsing error is non-critical — returning nulls
    return { countryCode: null, nationalNumber: null };
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cognitoService: CognitoService,
    private readonly snsService: SnsService,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
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

    this.logger.debug(`Registration - Cognito user created: ${cognitoResult?.UserSub}`);

    // Parse phone number to extract country code and national number (AFTER Cognito success)
    const phoneDetails = parsePhoneDetails(dto.mobile);

    // Generate a dev verification code when dev OTP is enabled or in non-production mode
    const isDevOtp =
      this.configService.get('ENABLE_DEV_OTP') === 'true' ||
      this.configService.get('NODE_ENV') !== 'production';
    const devVerificationCode = isDevOtp ? '123456' : undefined;

    // Store dev code in Redis for verification
    if (isDevOtp && devVerificationCode) {
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
        countryCode: phoneDetails.countryCode,
        nationalNumber: phoneDetails.nationalNumber,
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

    // Send welcome email (non-blocking)
    this.sqsService
      .sendWelcomeNotification({
        userId: user.id,
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        role: dto.role,
      })
      .catch((err) => this.logger.error(`Failed to queue welcome email: ${err.message}`));

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
        // Trigger resend verification code immediately
        this.resendVerification(dto.email).catch((err) => {
          this.logger.warn(`Failed to resend verification for ${dto.email}: ${err.message}`);
        });

        throw new UnauthorizedException({
          message: 'Please verify your email before logging in',
          data: {
            email: dto.email,
            requiresEmailVerification: true,
          },
        });
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
      throw new ForbiddenException({
        message: 'Your account has been blocked. Please contact support for assistance.',
        errorCode: 'USER_BLOCKED',
      });
    }

    // Update last login
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Block login and resend OTP if user is not verified
    if (!user.isVerified) {
      try {
        const isDevOtp =
          this.configService.get('ENABLE_DEV_OTP') === 'true' ||
          this.configService.get('NODE_ENV') !== 'production';
        const otp = isDevOtp ? '123456' : generateOtp();

        this.logger.debug(`Login - resending email verification OTP for user=${user.id}`);

        await this.redis.setex(
          `${CACHE_CONSTANTS.OTP_PREFIX}${user.id}:email`,
          CACHE_CONSTANTS.OTP_TTL,
          otp,
        );

        // Send verification email via SQS -> notification service
        this.sqsService
          .sendVerificationEmailNotification({
            userId: user.id,
            email: user.email,
            otp,
          })
          .catch((err) => this.logger.error(`Failed to queue verification email: ${err.message}`));
      } catch (error) {
        this.logger.error(`Failed to resend email verification OTP on login: ${error?.message || error}`);
      }

      throw new UnauthorizedException({
        message: 'Please verify your email before logging in',
        data: {
          email: dto.email,
          requiresEmailVerification: true,
        },
      });
    }

    const loginCompanyId = (user as any).companyId || null;

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      loginCompanyId, // Include company ID for admin/employer users
      user.isVerified,
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    const company = await this.getCompanyInfoForUser(user.id, user.role, loginCompanyId);
    const profilePhoto = await this.getProfilePhotoForUser(user.id, user.role);
    const employerPermissions = await this.getEmployerPermissions(user.id, user.role);

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
        company,
        profilePhoto,
        isVerified: user.isVerified || false,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
      permissions: employerPermissions,
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

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      await this.db.delete(sessions).where(eq(sessions.id, session.id));
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      // Delete the session for blocked user
      await this.db.delete(sessions).where(eq(sessions.id, session.id));
      throw new ForbiddenException({
        message: 'Your account has been blocked. Please contact support for assistance.',
        errorCode: 'USER_BLOCKED',
      });
    }

    // Delete old session
    await this.db.delete(sessions).where(eq(sessions.id, session.id));

    const refreshCompanyId = (user as any).companyId || null;

    // Generate new tokens (no Cognito refresh needed - we use local JWT tokens)
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      refreshCompanyId, // Include company ID for admin/employer users
      user.isVerified,
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    const company = await this.getCompanyInfoForUser(user.id, user.role, refreshCompanyId);
    const profilePhoto = await this.getProfilePhotoForUser(user.id, user.role);

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
        company,
        profilePhoto,
        isVerified: user.isVerified || false,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
    };
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
    const isDevOtp =
      this.configService.get('ENABLE_DEV_OTP') === 'true' ||
      this.configService.get('NODE_ENV') !== 'production';

    // In dev mode, check for dev verification code in Redis first
    if (isDevOtp) {
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

    const verifyCompanyId = (user as any).companyId || null;

    // Generate tokens so the user is automatically logged in after verification
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      verifyCompanyId,
      true, // isVerified is now true
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    const company = await this.getCompanyInfoForUser(user.id, user.role, verifyCompanyId);
    const profilePhoto = await this.getProfilePhotoForUser(user.id, user.role);

    return {
      message: 'Email verified successfully.',
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
        company,
        profilePhoto,
        isVerified: true,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; otp?: string }> {
    const email = dto.email.toLowerCase();
    let generatedOtp: string | undefined;

    try {
      this.logger.log(`Initiating forgot password for: ${email}`);

      // Check if user exists (silently - don't reveal to caller)
      const user = await this.db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user) {
        // Generate OTP and store in Redis
        const isDevOtp =
          this.configService.get('ENABLE_DEV_OTP') === 'true' ||
          this.configService.get('NODE_ENV') !== 'production';
        const otp = isDevOtp ? '123456' : generateOtp();
        generatedOtp = otp;

        await this.redis.setex(
          `${CACHE_CONSTANTS.OTP_PREFIX}forgot:${email}`,
          CACHE_CONSTANTS.OTP_TTL,
          otp,
        );

        this.logger.log(`Forgot password OTP stored for: ${email}`);

        // Send OTP email via SQS -> notification service
        this.sqsService
          .sendPasswordResetOtpNotification({
            userId: user.id,
            email,
            otp,
          })
          .catch((err) =>
            this.logger.error(`Failed to queue password reset OTP email: ${err.message}`),
          );
      }
    } catch (error: any) {
      // Don't reveal if user exists
      this.logger.warn(`Forgot password failed for ${email}: ${error.name} - ${error.message}`);
    }

    // TODO: Remove otp from response before production launch
    return {
      message: 'If email exists, reset instructions have been sent',
      ...(generatedOtp && { otp: generatedOtp }),
    };
  }

  /**
   * Step 2: Verify forgot password OTP and generate a temporary reset token
   * Validates OTP against the one stored in Redis during step 1
   */
  async verifyForgotPasswordOtp(
    dto: VerifyForgotPasswordOtpDto,
  ): Promise<VerifyForgotPasswordResponseDto> {
    const email = dto.email.toLowerCase();

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(dto.otp)) {
      throw new BadRequestException(
        'Invalid OTP format. Please enter the 6-digit code from your email.',
      );
    }

    // Retrieve stored OTP from Redis
    const storedOtp = await this.redis.get(`${CACHE_CONSTANTS.OTP_PREFIX}forgot:${email}`);

    if (!storedOtp) {
      throw new BadRequestException(
        'Invalid or expired code. Please request a new password reset.',
      );
    }

    // Validate OTP matches
    if (storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP. Please check your email and try again.');
    }

    // OTP is valid — delete it so it can't be reused
    await this.redis.del(`${CACHE_CONSTANTS.OTP_PREFIX}forgot:${email}`);

    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired code');
    }

    // Generate a secure reset password token
    const resetPasswordToken = randomUUID();

    // Store the token with email and userId in Redis
    const tokenData = JSON.stringify({
      email: email,
      userId: user.id,
      createdAt: Date.now(),
    });

    await this.redis.setex(
      `${CACHE_CONSTANTS.RESET_PASSWORD_TOKEN_PREFIX}${resetPasswordToken}`,
      CACHE_CONSTANTS.RESET_PASSWORD_TOKEN_TTL,
      tokenData,
    );

    this.logger.log(`Reset password token generated for: ${email}`);

    return {
      message: 'OTP verified successfully. Please reset your password within 15 minutes.',
      resetPasswordToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Retrieve token data from Redis
    const tokenData = await this.redis.get(
      `${CACHE_CONSTANTS.RESET_PASSWORD_TOKEN_PREFIX}${dto.resetPasswordToken}`,
    );

    if (!tokenData) {
      // Token not found in Redis - either invalid, already used, or expired (15 min TTL)
      throw new BadRequestException(
        'Reset token is invalid, expired, or has already been used. Please request a new password reset.',
      );
    }

    // Parse token data
    let parsedData: { email: string; userId: string; createdAt: number };
    try {
      parsedData = JSON.parse(tokenData);
    } catch {
      throw new BadRequestException('Invalid reset token format');
    }

    const { email, userId } = parsedData;

    // Immediately invalidate the token (single-use)
    await this.redis.del(`${CACHE_CONSTANTS.RESET_PASSWORD_TOKEN_PREFIX}${dto.resetPasswordToken}`);

    // OTP was already verified in step 2, use adminSetUserPassword to set the new password
    try {
      await this.cognitoService.adminSetUserPassword(email, dto.newPassword, true);
    } catch (error: any) {
      this.logger.error(`Password reset failed for ${email}: ${error.message}`);
      if (error.name === 'InvalidPasswordException') {
        throw new BadRequestException(
          'Password does not meet requirements. Use at least 8 characters with uppercase, lowercase, number, and special character.',
        );
      }
      throw new BadRequestException('Password reset failed. Please try again.');
    }

    // Invalidate all local sessions
    await this.db.delete(sessions).where(eq(sessions.userId, userId));

    this.logger.log(`Password reset successful for: ${email}`);

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

  async sendMobileOtp(mobile: string): Promise<MessageResponseDto & { otp?: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.mobile, mobile),
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User not found or inactive');
    }

    if (user.isMobileVerified) {
      return { message: 'Mobile already verified' };
    }

    const nodeEnv = this.configService.get('NODE_ENV');
    const isProduction = nodeEnv === 'production';
    const isStaging = nodeEnv === 'staging';

    // Generate OTP: dev/staging uses static '123456', production uses random
    const otp = isProduction ? randomInt(100000, 999999).toString() : '123456';

    // Store in DB with 10-min expiry
    await this.db.insert(otps).values({
      userId: user.id,
      otp,
      purpose: 'mobile_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Production: send OTP via AWS SNS
    if (isProduction) {
      try {
        await this.snsService.sendOtp(user.mobile, otp);
        this.logger.log(`Mobile OTP sent via SNS to ${user.mobile}`);
      } catch (error: any) {
        this.logger.error(`Failed to send mobile OTP via SNS: ${error.message}`);
        throw new BadRequestException('Failed to send OTP. Please try again.');
      }

      return { message: 'OTP sent to your mobile number' };
    }

    // Dev/Staging: OTP is stored in DB, return it in response for frontend
    this.logger.log(
      `[${isStaging ? 'Staging' : 'Dev'}] Mobile OTP generated for ${user.mobile}: ${otp}`,
    );

    return {
      message: 'OTP sent to your mobile number',
      otp,
    };
  }

  async verifyMobile(dto: VerifyMobileDto): Promise<VerifyEmailResponseDto | MessageResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.mobile, dto.mobile),
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
        eq(otps.userId, user.id),
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

    const verifyCompanyId = (user as any).companyId || null;

    // Generate tokens so the user is automatically logged in after verification
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      verifyCompanyId,
      user.isVerified || false,
      true, // isMobileVerified is now true
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    const company = await this.getCompanyInfoForUser(user.id, user.role, verifyCompanyId);
    const profilePhoto = await this.getProfilePhotoForUser(user.id, user.role);

    return {
      message: 'Mobile verified successfully.',
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
        company,
        profilePhoto,
        isVerified: user.isVerified || false,
        isMobileVerified: true,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponseDto> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User not found or inactive');
    }

    // Check if user has a Cognito account (registered with password)
    // OAuth-only users won't have a cognitoSub
    if (!user.cognitoSub) {
      throw new BadRequestException('Cannot change password for OAuth-only accounts');
    }

    try {
      // Verify current password by attempting to sign in with Cognito
      await this.cognitoService.signIn(user.email, dto.currentPassword);
    } catch (error: any) {
      if (error.name === 'NotAuthorizedException') {
        throw new BadRequestException('Invalid current password');
      }
      throw new BadRequestException('Password verification failed');
    }

    // Use admin method to set the new password in Cognito
    await this.cognitoService.adminSetUserPassword(user.email, dto.newPassword, true);

    // Invalidate all sessions (force logout from all devices)
    await this.db.delete(sessions).where(eq(sessions.userId, userId));

    // Invalidate cached user data
    await this.redis.del(`${CACHE_CONSTANTS.USER_PREFIX}${userId}`);

    // Send password changed confirmation email (non-blocking)
    this.sqsService
      .sendPasswordChangedNotification({
        userId,
        email: user.email,
        firstName: user.firstName,
      })
      .catch((err) => this.logger.error(`Failed to queue password changed email: ${err.message}`));

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

  /**
   * Get role-specific permissions
   * - SUPER_ADMIN: Full access (18 permissions) - Creates Companies and Admins
   * - ADMIN: Company-scoped access (12 permissions) - Creates Employers only
   * - EMPLOYER: Limited access - Creates Jobs only
   */
  private getPermissionsForRole(role: string): string[] {
    switch (role) {
      case 'super_admin':
        return [
          'users:read',
          'users:write',
          'users:delete',
          'roles:read',
          'roles:write',
          'roles:delete',
          'jobs:read',
          'jobs:write',
          'jobs:delete',
          'applications:read',
          'applications:write',
          'companies:read',
          'companies:write',
          'companies:delete',
          'analytics:read',
          'settings:read',
          'settings:write',
          'moderation:read',
          'moderation:write',
        ];

      case 'admin':
        return [
          'users:read', // Can view users in their company
          'employers:read',
          'employers:write',
          'employers:delete',
          'jobs:read',
          'jobs:write',
          'jobs:delete',
          'applications:read',
          'companies:read', // Can view their assigned company
          'analytics:read',
          'moderation:read',
          'moderation:write',
        ];

      case 'employer':
        return [
          'jobs:read',
          'jobs:write',
          'jobs:delete',
          'applications:read',
          'applications:write',
          'companies:read', // Can view their company
        ];

      default:
        return [];
    }
  }

  private static readonly EMPLOYER_RESOURCES = [
    'jobs',
    'applications',
    'interviews',
    'candidates',
    'companies',
    'employers',
  ];

  /** Permissions that should never be assigned to employer/super_employer */
  private static readonly EXCLUDED_EMPLOYER_PERMISSIONS = [
    'interviews:delete',
    'applications:delete',
  ];

  /**
   * Fetch employer permissions from RBAC tables.
   * - super_employer: returns ALL employer-assignable permissions (company owner)
   * - employer with rbacRoleId: returns assigned permissions
   * - employer without rbacRoleId: returns empty array
   * - other roles: returns empty array
   */
  private async getEmployerPermissions(userId: string, role: string): Promise<string[]> {
    if (role !== 'employer' && role !== 'super_employer') {
      return [];
    }

    // Super employer gets all employer-assignable permissions (excluding restricted ones)
    if (role === 'super_employer') {
      const allPermissions = await this.db.query.permissions.findMany({
        where: and(
          eq(permissions.isActive, true),
          inArray(permissions.resource, AuthService.EMPLOYER_RESOURCES),
        ),
      });
      return allPermissions
        .filter((p) => !AuthService.EXCLUDED_EMPLOYER_PERMISSIONS.includes(p.name))
        .map((p) => p.name);
    }

    // Regular employer: fetch from their assigned RBAC role
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { rbacRoleId: true },
    });

    if (!employer?.rbacRoleId) {
      return [];
    }

    const rps = await this.db.query.rolePermissions.findMany({
      where: eq(rolePermissions.roleId, employer.rbacRoleId),
      with: { permission: true },
    });

    return rps
      .filter((rp) => (rp.permission as any)?.isActive)
      .map((rp) => (rp.permission as any).name);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    companyId: string | null = null, // Company ID for admin/employer users
    isVerified: boolean = false,
    isMobileVerified: boolean = false,
    onboardingStep: number = 0,
    isOnboardingCompleted: boolean = false,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role, companyId };

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

    // Record login event (permanent — never deleted, used for login activity analytics)
    await this.db
      .insert(loginHistory)
      .values({ userId })
      .catch(() => {
        // Non-critical: don't fail login if history insert fails
      });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.convertExpiryToSeconds(accessTokenExpiry),
    };
  }

  /**
   * Fetch company info for employer/super_employer users.
   * Checks users.companyId first, falls back to employers.companyId.
   * Returns null if role is not employer/super_employer or no company is assigned.
   */
  private async getCompanyInfoForUser(
    userId: string,
    role: string,
    companyId: string | null,
  ): Promise<{ id: string; name: string; logoUrl: string | null; slug: string } | null> {
    if (role !== 'employer' && role !== 'super_employer') {
      return null;
    }

    // Resolve companyId: try users.companyId first, fall back to employers.companyId
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
        columns: { companyId: true },
      });
      resolvedCompanyId = employer?.companyId || null;
    }

    if (!resolvedCompanyId) {
      return null;
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, resolvedCompanyId),
      columns: { id: true, name: true, logoUrl: true, slug: true },
    });

    return company || null;
  }

  /**
   * Fetch profile photo for any user role.
   * Candidates: from profiles table. Employers/super_employer: from employers table.
   * Returns a permanent public S3 URL (never expires, no "Access Denied").
   */
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

  private async buildAuthResponse(
    cognitoAuth: CognitoAuthResult,
    user: any,
  ): Promise<AuthResponseDto> {
    const buildCompanyId = user.companyId || null;

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      buildCompanyId, // Include company ID for admin/employer users
      user.isVerified,
      user.isMobileVerified,
      user.onboardingStep || 0,
      user.isOnboardingCompleted || false,
    );

    const company = await this.getCompanyInfoForUser(user.id, user.role, buildCompanyId);
    const profilePhoto = await this.getProfilePhotoForUser(user.id, user.role);
    const employerPermissions = await this.getEmployerPermissions(user.id, user.role);

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
        company,
        profilePhoto,
        isVerified: user.isVerified || false,
        isMobileVerified: user.isMobileVerified || false,
        onboardingStep: user.onboardingStep || 0,
        isOnboardingCompleted: user.isOnboardingCompleted || false,
      },
      permissions: employerPermissions,
    };
  }

  async superAdminLogin(dto: SuperAdminLoginDto): Promise<SuperAdminLoginResponseDto> {
    const SUPER_ADMIN_EMAIL = 'jobboardsuperadmin@gmail.com';
    const SUPER_ADMIN_PASSWORD = 'Superadmin@1234';
    const SUPER_ADMIN_ID = '00000000-0000-0000-0000-000000000000';

    // First, try to find user in database (supports both super_admin and admin)
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    let userId: string;
    let firstName: string;
    let lastName: string;
    let mobile: string;
    let userRole: string;
    let email: string;
    let companyId: string | null;
    let companyName: string | null = null;

    if (user) {
      // Real user exists - verify password with bcrypt
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify user has admin role (also allow hardcoded super admin)
      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
      if (user.role !== 'admin' && !isSuperAdmin) {
        throw new UnauthorizedException('Admin panel access denied. Only admin users are allowed.');
      }

      userId = user.id;
      firstName = user.firstName;
      lastName = user.lastName;
      mobile = user.mobile || '';
      userRole = user.role;
      email = user.email;
      companyId = (user as any).companyId || null;

      // Get company name if user has company assignment
      if (companyId) {
        const { companies } = await import('@ai-job-portal/database');
        const company = await this.db.query.companies.findFirst({
          where: eq(companies.id, companyId),
        });
        companyName = company?.name || null;
      }
    } else {
      // Fallback to hardcoded super admin
      if (dto.email !== SUPER_ADMIN_EMAIL || dto.password !== SUPER_ADMIN_PASSWORD) {
        throw new UnauthorizedException('Invalid email or password');
      }

      userId = SUPER_ADMIN_ID;
      firstName = 'Super';
      lastName = 'Admin';
      mobile = '';
      userRole = 'super_admin';
      email = SUPER_ADMIN_EMAIL;
      companyId = null;
    }

    // Generate token with company context
    const payload: JwtPayload = {
      sub: userId,
      email: email,
      role: userRole,
      companyId: companyId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '365d',
    });

    // Role-specific permissions
    const permissions = this.getPermissionsForRole(userRole);

    return {
      accessToken,
      expiresIn: '365d',
      user: {
        userId,
        role: userRole,
        firstName,
        lastName,
        email,
        mobile,
        company: companyId
          ? { id: companyId, name: companyName || '', logoUrl: null, slug: '' }
          : null,
        isVerified: true,
        isMobileVerified: false,
        onboardingStep: 0,
        isOnboardingCompleted: true,
      },
      permissions,
    };
  }
}
