import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { Database, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class TwoFactorService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'AI Job Portal', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    // Store secret on users table (not enabled yet)
    await this.db.update(users)
      .set({ twoFactorSecret: secret, twoFactorEnabled: false })
      .where(eq(users.id, userId));

    return { secret, qrCodeUrl };
  }

  async verifyAndEnable(userId: string, token: string): Promise<{ enabled: boolean }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));

    return { enabled: true };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return true; // 2FA not enabled, skip verification
    }

    return authenticator.verify({ token, secret: user.twoFactorSecret });
  }

  async disable(userId: string, token: string): Promise<void> {
    const isValid = await this.verify(userId, token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.db.update(users)
      .set({ twoFactorSecret: null, twoFactorEnabled: false })
      .where(eq(users.id, userId));
  }

  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user?.twoFactorEnabled ?? false;
  }
}
