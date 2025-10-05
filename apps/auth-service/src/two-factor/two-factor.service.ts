import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    this.appName = this.configService.get<string>('app.twoFactor.appName');
  }

  /**
   * Generate 2FA secret and QR code
   */
  async generateSecret(userEmail: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${userEmail})`,
      issuer: this.appName,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes (10 codes)
    const backupCodes = this.generateBackupCodes(10);

    this.logger.log(`2FA secret generated for ${userEmail}`);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret: string, token: string): boolean {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after current time (60 seconds)
    });

    return verified;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Format backup codes for display (XXXX-XXXX format)
   */
  formatBackupCode(code: string): string {
    if (code.length !== 8) return code;
    return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
  }
}
