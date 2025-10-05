import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { nanoid } from 'nanoid';

interface OtpData {
  otp: string;
  mobile: string;
  attempts: number;
  createdAt: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;
  private readonly OTP_EXPIRY = 300; // 5 minutes in seconds
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW = 900; // 15 minutes in seconds
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('app.redis.host');
    const redisPort = this.configService.get<number>('app.redis.port');
    const redisPassword = this.configService.get<string>('app.redis.password');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    });

    this.logger.log('OTP service initialized with Redis');
  }

  /**
   * Generate a random 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check rate limiting for OTP requests
   */
  private async checkRateLimit(mobile: string): Promise<void> {
    const rateLimitKey = `otp:ratelimit:${mobile}`;
    const requestCount = await this.redis.get(rateLimitKey);

    if (requestCount && parseInt(requestCount) >= this.MAX_REQUESTS_PER_WINDOW) {
      const ttl = await this.redis.ttl(rateLimitKey);
      throw new BadRequestException(
        `Too many OTP requests. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
      );
    }
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(mobile: string): Promise<void> {
    const rateLimitKey = `otp:ratelimit:${mobile}`;
    const currentCount = await this.redis.get(rateLimitKey);

    if (!currentCount) {
      await this.redis.setex(rateLimitKey, this.RATE_LIMIT_WINDOW, '1');
    } else {
      await this.redis.incr(rateLimitKey);
    }
  }

  /**
   * Store OTP in Redis
   */
  async createOtp(mobile: string): Promise<string> {
    // Check rate limiting
    await this.checkRateLimit(mobile);

    // Generate OTP
    const otp = this.generateOtp();
    const otpKey = `otp:${mobile}`;

    const otpData: OtpData = {
      otp,
      mobile,
      attempts: 0,
      createdAt: Date.now(),
    };

    // Store OTP with expiry
    await this.redis.setex(otpKey, this.OTP_EXPIRY, JSON.stringify(otpData));

    // Increment rate limit
    await this.incrementRateLimit(mobile);

    this.logger.log(`OTP generated for ${mobile}`);
    return otp;
  }

  /**
   * Verify OTP
   */
  async verifyOtp(mobile: string, otp: string): Promise<boolean> {
    const otpKey = `otp:${mobile}`;
    const storedData = await this.redis.get(otpKey);

    if (!storedData) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    const otpData: OtpData = JSON.parse(storedData);

    // Check max attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      await this.redis.del(otpKey);
      throw new UnauthorizedException('Maximum verification attempts exceeded');
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      // Increment attempt counter
      otpData.attempts += 1;
      const ttl = await this.redis.ttl(otpKey);
      await this.redis.setex(otpKey, ttl, JSON.stringify(otpData));

      throw new UnauthorizedException(
        `Invalid OTP. ${this.MAX_ATTEMPTS - otpData.attempts} attempts remaining.`,
      );
    }

    // OTP verified successfully - delete it
    await this.redis.del(otpKey);
    this.logger.log(`OTP verified successfully for ${mobile}`);
    return true;
  }

  /**
   * Check if OTP can be resent (60 seconds cooldown)
   */
  async canResendOtp(mobile: string): Promise<boolean> {
    const otpKey = `otp:${mobile}`;
    const storedData = await this.redis.get(otpKey);

    if (!storedData) {
      return true; // No OTP exists, can send new one
    }

    const otpData: OtpData = JSON.parse(storedData);
    const timeSinceCreation = Date.now() - otpData.createdAt;

    // 60 seconds cooldown
    return timeSinceCreation > 60000;
  }

  /**
   * Delete OTP
   */
  async deleteOtp(mobile: string): Promise<void> {
    const otpKey = `otp:${mobile}`;
    await this.redis.del(otpKey);
  }

  /**
   * Clean up on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
