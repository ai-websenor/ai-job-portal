/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import { Database, users, employers, companies } from '@ai-job-portal/database';
import { CognitoService, SnsService, SqsService, S3Service } from '@ai-job-portal/aws';
import { randomInt, randomUUID } from 'crypto';
import { parsePhoneNumber } from 'libphonenumber-js';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import {
  SendMobileOtpDto,
  VerifyMobileOtpDto,
  SendEmailOtpDto,
  VerifyEmailOtpDto,
  BasicDetailsDto,
} from './dto';

const SESSION_PREFIX = 'company_reg:';
const SESSION_TTL = 1800; // 30 minutes

interface RegistrationSession {
  mobile: string;
  mobileOtp: string;
  mobileVerified: boolean;
  email?: string;
  emailOtp?: string;
  emailVerified: boolean;
  accountType?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  country?: string;
  state?: string;
  city?: string;
  step: number;
}

function generateOtp(): string {
  // TODO: Replace with, return randomInt(100000, 999999).toString() before production launch
  return '123456';
}

function parsePhoneDetails(phone: string): {
  countryCode: string | null;
  nationalNumber: string | null;
} {
  try {
    const parsed = parsePhoneNumber(phone);
    if (parsed && parsed.isValid()) {
      return {
        countryCode: `+${parsed.countryCallingCode}`,
        nationalNumber: parsed.nationalNumber,
      };
    }
    return { countryCode: null, nationalNumber: null };
  } catch {
    return { countryCode: null, nationalNumber: null };
  }
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Date.now().toString(36)
  );
}

@Injectable()
export class CompanyRegistrationService {
  private readonly logger = new Logger(CompanyRegistrationService.name);

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

  private isDev(): boolean {
    return this.configService.get('NODE_ENV') !== 'production';
  }

  private async getSession(sessionToken: string): Promise<RegistrationSession> {
    const data = await this.redis.get(`${SESSION_PREFIX}${sessionToken}`);
    if (!data) {
      throw new BadRequestException('Session expired or invalid. Please start registration again.');
    }
    return JSON.parse(data);
  }

  private async saveSession(sessionToken: string, session: RegistrationSession): Promise<void> {
    await this.redis.setex(
      `${SESSION_PREFIX}${sessionToken}`,
      SESSION_TTL,
      JSON.stringify(session),
    );
  }

  // ============================================
  // Step 1: Send Mobile OTP
  // ============================================

  async sendMobileOtp(dto: SendMobileOtpDto) {
    // Check if mobile already registered
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.mobile, dto.mobile),
    });

    if (existingUser) {
      throw new ConflictException('Mobile number is already registered');
    }

    const otp = this.isDev() ? '123456' : generateOtp();
    const sessionToken = randomUUID();

    const session: RegistrationSession = {
      mobile: dto.mobile,
      mobileOtp: otp,
      mobileVerified: false,
      emailVerified: false,
      step: 1,
    };

    await this.saveSession(sessionToken, session);

    // Send OTP via SMS (skip in dev)
    if (!this.isDev()) {
      try {
        await this.snsService.sendOtp(dto.mobile, otp);
        this.logger.log(`Mobile OTP sent to ${dto.mobile}`);
      } catch (error: any) {
        this.logger.error(`Failed to send mobile OTP: ${error.message}`);
        throw new BadRequestException('Failed to send OTP. Please try again.');
      }
    }

    return {
      sessionToken,
      otp,
      message: 'OTP sent to your mobile number',
    };
  }

  // ============================================
  // Step 2: Verify Mobile OTP
  // ============================================

  async verifyMobileOtp(dto: VerifyMobileOtpDto) {
    const session = await this.getSession(dto.sessionToken);

    if (session.step < 1) {
      throw new BadRequestException('Please send mobile OTP first');
    }

    if (session.mobileVerified) {
      return {
        sessionToken: dto.sessionToken,
        message: 'Mobile already verified',
      };
    }

    if (session.mobileOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    session.mobileVerified = true;
    session.step = 2;
    await this.saveSession(dto.sessionToken, session);

    this.logger.log(`Mobile verified for session ${dto.sessionToken}`);

    return {
      sessionToken: dto.sessionToken,
      message: 'Mobile verified successfully',
    };
  }

  // ============================================
  // Step 3: Send Email OTP
  // ============================================

  async sendEmailOtp(dto: SendEmailOtpDto) {
    const session = await this.getSession(dto.sessionToken);

    if (!session.mobileVerified) {
      throw new BadRequestException('Please verify your mobile number first');
    }

    // Check if email already registered
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const otp = this.isDev() ? '123456' : generateOtp();

    session.email = dto.email.toLowerCase();
    session.emailOtp = otp;
    session.emailVerified = false;
    session.step = 3;
    await this.saveSession(dto.sessionToken, session);

    // Send OTP via email (SQS → notification service)
    if (!this.isDev()) {
      try {
        await this.sqsService.sendVerificationEmailNotification({
          userId: dto.sessionToken, // Use session token as placeholder
          email: dto.email.toLowerCase(),
          otp,
        });
        this.logger.log(`Email OTP sent to ${dto.email}`);
      } catch (error: any) {
        this.logger.error(`Failed to send email OTP: ${error.message}`);
        throw new BadRequestException('Failed to send OTP. Please try again.');
      }
    }

    return {
      sessionToken: dto.sessionToken,
      otp,
      message: 'OTP sent to your email',
    };
  }

  // ============================================
  // Step 4: Verify Email OTP
  // ============================================

  async verifyEmailOtp(dto: VerifyEmailOtpDto) {
    const session = await this.getSession(dto.sessionToken);

    if (session.step < 3) {
      throw new BadRequestException('Please send email OTP first');
    }

    if (session.emailVerified) {
      return {
        sessionToken: dto.sessionToken,
        message: 'Email already verified',
      };
    }

    if (session.emailOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    session.emailVerified = true;
    session.step = 4;
    await this.saveSession(dto.sessionToken, session);

    this.logger.log(`Email verified for session ${dto.sessionToken}`);

    return {
      sessionToken: dto.sessionToken,
      message: 'Email verified successfully',
    };
  }

  // ============================================
  // Step 5: Basic Details
  // ============================================

  async submitBasicDetails(dto: BasicDetailsDto) {
    const session = await this.getSession(dto.sessionToken);

    if (!session.mobileVerified || !session.emailVerified) {
      throw new BadRequestException(
        'Please verify both mobile and email before submitting details',
      );
    }

    session.accountType = dto.accountType;
    session.firstName = dto.firstName;
    session.lastName = dto.lastName;
    session.password = dto.password;
    session.country = dto.country;
    session.state = dto.state;
    session.city = dto.city;
    session.step = 5;
    await this.saveSession(dto.sessionToken, session);

    this.logger.log(`Basic details saved for session ${dto.sessionToken}`);

    return {
      sessionToken: dto.sessionToken,
      message: 'Basic details saved successfully',
    };
  }

  // ============================================
  // Step 6: GST Document Upload + Company Details & Complete Registration
  // ============================================

  /**
   * Generate a pre-signed URL for uploading a GST document during registration.
   * Uses sessionToken for authorization (no JWT needed).
   */
  async getGstDocumentUploadUrl(sessionToken: string, fileName: string, contentType: string) {
    const session = await this.getSession(sessionToken);

    if (session.step < 5) {
      throw new BadRequestException(
        'Please complete all previous steps before uploading documents',
      );
    }

    const key = this.s3Service.generateKey('company-gst-documents', fileName);
    const expiresIn = 3600; // 1 hour
    const uploadUrl = await this.s3Service.getSignedUploadUrl(key, contentType, expiresIn);

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  async completeRegistration(
    sessionToken: string,
    companyName: string,
    panNumber: string,
    gstNumber: string,
    cinNumber: string,
    gstDocumentKey?: string,
  ) {
    const session = await this.getSession(sessionToken);

    if (session.step < 5) {
      throw new BadRequestException(
        'Please complete all previous steps before submitting company details',
      );
    }

    if (!session.firstName || !session.lastName || !session.password || !session.email) {
      throw new BadRequestException('Session data is incomplete. Please start registration again.');
    }

    // Verify GST document exists in S3 if key is provided
    let gstDocumentUrl: string | undefined;
    if (gstDocumentKey) {
      if (!gstDocumentKey.startsWith('company-gst-documents/')) {
        throw new BadRequestException('Invalid GST document key');
      }

      const exists = await this.s3Service.exists(gstDocumentKey);
      if (!exists) {
        throw new BadRequestException(
          'GST document not found in storage. Please upload the file first using the pre-signed URL.',
        );
      }

      gstDocumentUrl = this.s3Service.getPublicUrl(gstDocumentKey);
      this.logger.log(`GST document verified: ${gstDocumentKey}`);
    }

    // Register with Cognito (handle case where user already exists from a previous failed attempt)
    let cognitoSub: string;
    try {
      const cognitoResult = await this.cognitoService.signUp(session.email, session.password, {
        givenName: session.firstName,
        familyName: session.lastName,
        phoneNumber: session.mobile,
      });
      cognitoSub = cognitoResult.userSub;
      this.logger.log(`Cognito user created: ${cognitoSub}`);
    } catch (error: any) {
      if (
        error.name === 'UsernameExistsException' ||
        error.message?.includes('User already exists')
      ) {
        // User exists in Cognito from a previous failed attempt — retrieve their sub
        this.logger.warn(
          `Cognito user already exists for ${session.email}, retrieving existing user`,
        );
        const existingUser = await this.cognitoService.adminGetUser(session.email);
        if (!existingUser) {
          throw new BadRequestException(
            'User exists in Cognito but could not be retrieved. Please contact support.',
          );
        }
        cognitoSub = existingUser.sub;
      } else {
        throw error;
      }
    }

    // Auto-confirm in Cognito (email already verified via OTP)
    try {
      await this.cognitoService.adminConfirmSignUp(session.email);
      this.logger.log(`Cognito user auto-confirmed: ${session.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to auto-confirm Cognito user: ${error.message}`);
      // Continue even if auto-confirm fails - user may already be confirmed
    }

    // Parse phone number
    const phoneDetails = parsePhoneDetails(session.mobile);

    // Create user record
    const [user] = await this.db
      .insert(users)
      .values({
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        password: '', // Cognito handles passwords
        mobile: session.mobile,
        countryCode: phoneDetails.countryCode,
        nationalNumber: phoneDetails.nationalNumber,
        role: 'super_employer',
        cognitoSub,
        accountType: session.accountType as any,
        country: session.country,
        state: session.state,
        city: session.city,
        isVerified: true,
        isMobileVerified: true,
      })
      .returning({ id: users.id });

    this.logger.log(`User created: ${user.id}`);

    // Create employer record
    await this.db.insert(employers).values({
      userId: user.id,
      isVerified: false,
      subscriptionPlan: 'free' as const,
      firstName: session.firstName,
      lastName: session.lastName,
      email: session.email,
      phone: session.mobile,
      visibility: true,
    });

    // Create company record
    const slug = generateSlug(companyName);
    const [company] = await this.db
      .insert(companies)
      .values({
        userId: user.id,
        name: companyName,
        slug,
        panNumber,
        gstNumber,
        cinNumber,
        gstDocumentUrl,
        verificationStatus: 'pending',
        kycDocuments: !!gstDocumentUrl,
      })
      .returning();

    this.logger.log(`Company created: ${company.id}`);

    // Link employer to company
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, user.id),
    });

    if (employer) {
      await this.db
        .update(employers)
        .set({ companyId: company.id })
        .where(eq(employers.id, employer.id));
    }

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      email: session.email,
      role: 'super_employer',
      companyId: company.id,
    };

    const accessTokenExpiry = this.configService.get('JWT_ACCESS_EXPIRY') || '365d';
    const refreshTokenExpiry = this.configService.get('JWT_REFRESH_EXPIRY') || '365d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: refreshTokenExpiry,
    });

    // Store session
    const { sessions } = await import('@ai-job-portal/database');
    const refreshExpirySeconds = this.convertExpiryToSeconds(refreshTokenExpiry);
    const expiresAt = new Date(Date.now() + refreshExpirySeconds * 1000);
    await this.db.insert(sessions).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    // Delete registration session from Redis
    await this.redis.del(`${SESSION_PREFIX}${sessionToken}`);

    // Send welcome email (non-blocking)
    this.sqsService
      .sendWelcomeNotification({
        userId: user.id,
        email: session.email,
        firstName: session.firstName,
        role: 'super_employer',
      })
      .catch((err) => this.logger.error(`Failed to queue welcome email: ${err.message}`));

    return {
      accessToken,
      refreshToken,
      expiresIn: this.convertExpiryToSeconds(accessTokenExpiry),
      user: {
        userId: user.id,
        role: 'super_employer',
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        mobile: session.mobile,
        isVerified: true,
        isMobileVerified: true,
      },
      company: {
        companyId: company.id,
        companyName: company.name,
        slug: company.slug,
        verificationStatus: company.verificationStatus,
      },
      message: 'Company registration completed successfully',
    };
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
}
