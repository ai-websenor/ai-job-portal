import { Injectable, Inject, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import { Database, users, sessions, emailVerifications } from '@ai-job-portal/database';
import { generateOtp, generateToken } from '@ai-job-portal/common';
import { CACHE_CONSTANTS, JWT_CONSTANTS } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RegisterDto, LoginDto, RefreshTokenDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
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
    const [user] = await this.db.insert(users).values({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      mobile: dto.mobile,
      role: dto.role,
    }).returning({ id: users.id });

    // Generate verification OTP
    // const otp = generateOtp();
    const otp = "123456";
    console.log("OTP>>", otp)
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

  async login(dto: LoginDto): Promise<AuthTokens> {
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
    await this.db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
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

      return this.generateTokens(user.id, user.email, user.role);
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

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const storedOtp = await this.redis.get(`${CACHE_CONSTANTS.OTP_PREFIX}${dto.userId}:email`);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.db.update(users)
      .set({ isVerified: true })
      .where(eq(users.id, dto.userId));

    await this.redis.del(`${CACHE_CONSTANTS.OTP_PREFIX}${dto.userId}:email`);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string, token?: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, reset instructions sent' };
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.db.insert(emailVerifications).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // TODO: Send reset email via SES

    return { token, message: 'If email exists, reset instructions sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const verification = await this.db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.token, dto.token),
    });

    if (!verification || verification.expiresAt < new Date() || verification.verifiedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, verification.userId));

    // Mark token as used
    await this.db.update(emailVerifications)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    // Invalidate all sessions
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

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      expiresIn: JWT_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });

    // Store session with token field
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.db.insert(sessions).values({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }
}
