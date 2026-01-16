import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { Database, twoFactorSecrets, users } from '@ai-job-portal/database';
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

    // Store secret (not enabled yet)
    await this.db.insert(twoFactorSecrets)
      .values({
        userId,
        secret,
        isEnabled: false,
      })
      .onConflictDoUpdate({
        target: twoFactorSecrets.userId,
        set: { secret, isEnabled: false },
      });

    return { secret, qrCodeUrl };
  }

  async verifyAndEnable(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const twoFactor = await this.db.query.twoFactorSecrets.findFirst({
      where: eq(twoFactorSecrets.userId, userId),
    });

    if (!twoFactor) {
      throw new BadRequestException('2FA not set up');
    }

    const isValid = authenticator.verify({ token, secret: twoFactor.secret });
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase(),
    );

    await this.db.update(twoFactorSecrets)
      .set({
        isEnabled: true,
        backupCodes: JSON.stringify(backupCodes),
      })
      .where(eq(twoFactorSecrets.userId, userId));

    return { backupCodes };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.db.query.twoFactorSecrets.findFirst({
      where: eq(twoFactorSecrets.userId, userId),
    });

    if (!twoFactor || !twoFactor.isEnabled) {
      return true; // 2FA not enabled, skip verification
    }

    const isValid = authenticator.verify({ token, secret: twoFactor.secret });

    if (!isValid && twoFactor.backupCodes) {
      // Check backup codes
      const codes: string[] = JSON.parse(twoFactor.backupCodes);
      const codeIndex = codes.indexOf(token.toUpperCase());

      if (codeIndex !== -1) {
        // Remove used backup code
        codes.splice(codeIndex, 1);
        await this.db.update(twoFactorSecrets)
          .set({ backupCodes: JSON.stringify(codes) })
          .where(eq(twoFactorSecrets.userId, userId));
        return true;
      }
    }

    return isValid;
  }

  async disable(userId: string, token: string): Promise<void> {
    const isValid = await this.verify(userId, token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.db.delete(twoFactorSecrets).where(eq(twoFactorSecrets.userId, userId));
  }

  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.db.query.twoFactorSecrets.findFirst({
      where: eq(twoFactorSecrets.userId, userId),
    });

    return twoFactor?.isEnabled ?? false;
  }
}
