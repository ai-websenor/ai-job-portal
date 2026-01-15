import { db, otps } from '@ai-job-portal/database';
import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { and, desc, eq } from 'drizzle-orm';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;

  private readonly OTP_EXPIRY = 60; // 1 minute
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW = 900; // 15 minutes
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('app.redis.host'),
      port: this.configService.get<number>('app.redis.port'),
      password: this.configService.get<string>('app.redis.password'),
    });

    this.logger.log('OTP service initialized');
  }

  /* -------------------- Helpers -------------------- */

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /* -------------------- Rate Limiting (Redis) -------------------- */

  private async checkRateLimit(email: string): Promise<void> {
    const key = `otp:ratelimit:${email}`;
    const count = await this.redis.get(key);

    if (count && Number(count) >= this.MAX_REQUESTS_PER_WINDOW) {
      const ttl = await this.redis.ttl(key);
      throw new BadRequestException(
        `Too many OTP requests. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      );
    }
  }

  private async incrementRateLimit(email: string): Promise<void> {
    const key = `otp:ratelimit:${email}`;
    const count = await this.redis.get(key);

    if (!count) {
      await this.redis.setex(key, this.RATE_LIMIT_WINDOW, '1');
    } else {
      await this.redis.incr(key);
    }
  }

  /* -------------------- Create OTP -------------------- */

  async createOtp(email: string): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    await this.checkRateLimit(normalizedEmail);

    const otp = process.env.NODE_ENV === 'development' ? '123456' : this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY * 1000);

    // Invalidate old OTPs
    await db.update(otps).set({ isUsed: true }).where(eq(otps.email, normalizedEmail));

    // Store OTP
    await db.insert(otps).values({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      isUsed: false,
      createdAt: new Date(),
    });
    await this.incrementRateLimit(normalizedEmail);

    this.logger.log(`OTP generated for ${normalizedEmail}`);
    return otp; // send via email
  }

  /* -------------------- Verify OTP -------------------- */

  async verifyOtp(email: string, otp: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const record = await db.query.otps.findFirst({
      where: and(eq(otps.email, normalizedEmail), eq(otps.isUsed, false)),
      orderBy: desc(otps.createdAt),
    });

    if (!record) {
      throw new UnauthorizedException('OTP not found or expired');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired');
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as used
    await db.update(otps).set({ isUsed: true, usedAt: new Date() }).where(eq(otps.id, record.id));

    this.logger.log(`OTP verified for ${normalizedEmail}`);
  }

  /* -------------------- Resend Check -------------------- */

  async canResendOtp(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const lastOtp = await db.query.otps.findFirst({
      where: eq(otps.email, normalizedEmail),
      orderBy: desc(otps.createdAt),
    });

    if (!lastOtp) return true;

    return Date.now() - lastOtp.createdAt.getTime() > 60_000; // 60 sec
  }

  /* -------------------- Cleanup -------------------- */

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
