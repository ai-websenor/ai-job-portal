import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { eq } from 'drizzle-orm';
import {
  Database,
  secretManagerCredentials,
  adminUsers,
  activityLogs,
} from '@ai-job-portal/database';
import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  verifyTotp,
  totpAuthUri,
  generateOtp,
} from '@ai-job-portal/common';
import { SesService, SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';

const VAULT_SCOPE = 'secret-manager';
const VAULT_TTL_SECONDS = 20 * 60; // hard 20-minute session
const BCRYPT_ROUNDS = 12;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15-minute lockout
const OTP_TTL_SECONDS = 10 * 60;
const ISSUER = 'AI Job Portal Secret Manager';

export interface VaultTokenResult {
  vaultToken: string;
  expiresIn: number;
}

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly ses: SesService,
    private readonly sqs: SqsService,
  ) {}

  // ---------- credential helpers ----------

  private async getCredential(userId: string) {
    return this.db.query.secretManagerCredentials.findFirst({
      where: eq(secretManagerCredentials.userId, userId),
    });
  }

  private async resolveAdminUserId(userId: string): Promise<string | null> {
    const admin = await this.db.query.adminUsers.findFirst({
      where: eq(adminUsers.userId, userId),
    });
    return admin?.id ?? null;
  }

  private async audit(
    userId: string,
    action: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    try {
      await this.db.insert(activityLogs).values({
        userId,
        action,
        entityType: 'secret_vault',
        entityId: userId,
        oldData: details ? JSON.stringify(details) : null,
        ipAddress,
      } as any);
    } catch (err: any) {
      this.logger.warn(`Failed to write audit log (${action}): ${err.message}`);
    }
  }

  private assertNotLocked(cred: { lockedUntil: Date | null }) {
    if (cred.lockedUntil && cred.lockedUntil.getTime() > Date.now()) {
      const seconds = Math.ceil((cred.lockedUntil.getTime() - Date.now()) / 1000);
      throw new ForbiddenException(
        `Vault locked due to failed attempts. Try again in ${seconds}s.`,
      );
    }
  }

  /**
   * DEV-ONLY: accept the static code 123456 when NODE_ENV !== production, so the vault is testable
   * without enrolling an authenticator app. Real TOTP codes still validate. NEVER active in prod.
   */
  private checkTotp(secret: string, token: string): boolean {
    if (this.config.get('NODE_ENV') !== 'production' && token === '123456') {
      return true;
    }
    return verifyTotp(token, secret);
  }

  private async registerFailure(userId: string, current: number) {
    const attempts = current + 1;
    if (attempts >= MAX_FAILS) {
      await this.db
        .update(secretManagerCredentials)
        .set({
          failedAttempts: 0,
          lockedUntil: new Date(Date.now() + LOCK_MS),
          updatedAt: new Date(),
        })
        .where(eq(secretManagerCredentials.userId, userId));
    } else {
      await this.db
        .update(secretManagerCredentials)
        .set({ failedAttempts: attempts, updatedAt: new Date() })
        .where(eq(secretManagerCredentials.userId, userId));
    }
  }

  private async clearFailures(userId: string) {
    await this.db
      .update(secretManagerCredentials)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        lastUnlockAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(secretManagerCredentials.userId, userId));
  }

  // ---------- status / setup ----------

  async status(userId: string) {
    const cred = await this.getCredential(userId);
    const locked = !!(cred?.lockedUntil && cred.lockedUntil.getTime() > Date.now());
    return {
      configured: !!cred,
      totpEnabled: cred?.totpEnabled ?? false,
      locked,
      lockedUntil: locked ? cred?.lockedUntil : null,
    };
  }

  /** First-time vault setup: store passphrase hash + recovery contacts, enroll a TOTP secret. */
  async setup(
    userId: string,
    passphrase: string,
    recoveryEmail: string,
    recoveryMobile: string,
    accountEmail: string,
  ) {
    const existing = await this.getCredential(userId);
    if (existing) {
      throw new ConflictException(
        'Vault already configured. Use change-passphrase or recovery to update.',
      );
    }

    const passphraseHash = await bcrypt.hash(passphrase, BCRYPT_ROUNDS);
    const totpSecret = generateTotpSecret();
    const totpSecretEnc = encryptSecret(totpSecret).packed; // encrypt the TOTP secret at rest
    const adminUserId = await this.resolveAdminUserId(userId);

    await this.db.insert(secretManagerCredentials).values({
      userId,
      adminUserId,
      passphraseHash,
      totpSecretEnc,
      totpEnabled: false,
      recoveryEmail,
      recoveryMobile,
    });

    await this.audit(userId, 'vault.setup', { recoveryEmail: this.maskEmail(recoveryEmail) });

    return {
      // Returned ONCE so the admin can add it to their authenticator app.
      otpauthUrl: totpAuthUri(accountEmail, ISSUER, totpSecret),
      secret: totpSecret,
    };
  }

  /** Confirm the first TOTP code to enable the vault. */
  async confirmTotp(userId: string, token: string) {
    const cred = await this.getCredential(userId);
    if (!cred || !cred.totpSecretEnc) {
      throw new BadRequestException('Vault not set up');
    }
    const secret = decryptSecret(cred.totpSecretEnc);
    if (!this.checkTotp(secret, token)) {
      throw new ForbiddenException('Invalid authenticator code');
    }
    await this.db
      .update(secretManagerCredentials)
      .set({ totpEnabled: true, updatedAt: new Date() })
      .where(eq(secretManagerCredentials.userId, userId));
    await this.audit(userId, 'vault.totp_enabled');
    return { enabled: true };
  }

  // ---------- unlock / session ----------

  async unlock(
    userId: string,
    passphrase: string,
    totp: string,
    ip?: string,
  ): Promise<VaultTokenResult> {
    const cred = await this.getCredential(userId);
    if (!cred || !cred.totpEnabled || !cred.totpSecretEnc) {
      throw new BadRequestException('Vault not set up');
    }
    this.assertNotLocked(cred);

    const passOk = await bcrypt.compare(passphrase, cred.passphraseHash);
    const totpOk = this.checkTotp(decryptSecret(cred.totpSecretEnc), totp);

    if (!passOk || !totpOk) {
      await this.registerFailure(userId, cred.failedAttempts);
      await this.audit(
        userId,
        'vault.unlock_failed',
        { reason: !passOk ? 'passphrase' : 'totp' },
        ip,
      );
      throw new ForbiddenException('Invalid passphrase or authenticator code');
    }

    await this.clearFailures(userId);
    const token = await this.issueToken(userId);
    await this.audit(userId, 'vault.unlock', undefined, ip);
    return token;
  }

  private async issueToken(userId: string): Promise<VaultTokenResult> {
    const jti = randomUUID();
    const vaultToken = this.jwt.sign(
      { sub: userId, scope: VAULT_SCOPE, jti },
      { expiresIn: VAULT_TTL_SECONDS },
    );
    // Server-side session record enables hard expiry + revocation independent of the JWT.
    await this.redis.set(`vault:sess:${jti}`, userId, 'EX', VAULT_TTL_SECONDS);
    return { vaultToken, expiresIn: VAULT_TTL_SECONDS };
  }

  /** Used by VaultGuard: validate the vault token signature, scope, owner and live session. */
  async verifyVaultToken(token: string, userId: string): Promise<boolean> {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      return false;
    }
    if (payload.scope !== VAULT_SCOPE || payload.sub !== userId || !payload.jti) {
      return false;
    }
    const live = await this.redis.get(`vault:sess:${payload.jti}`);
    return live === userId;
  }

  async lock(token: string) {
    try {
      const payload: any = this.jwt.verify(token);
      if (payload?.jti) {
        await this.redis.del(`vault:sess:${payload.jti}`);
      }
    } catch {
      // already invalid — nothing to revoke
    }
    return { locked: true };
  }

  /** Verify a fresh TOTP for sensitive in-session actions (reveal, change passphrase). */
  async assertFreshTotp(userId: string, token: string) {
    const cred = await this.getCredential(userId);
    if (!cred || !cred.totpSecretEnc) {
      throw new BadRequestException('Vault not set up');
    }
    if (!this.checkTotp(decryptSecret(cred.totpSecretEnc), token)) {
      throw new ForbiddenException('Invalid authenticator code');
    }
  }

  async changePassphrase(userId: string, current: string, next: string, totp: string) {
    const cred = await this.getCredential(userId);
    if (!cred) {
      throw new BadRequestException('Vault not set up');
    }
    this.assertNotLocked(cred);
    const ok =
      (await bcrypt.compare(current, cred.passphraseHash)) &&
      this.checkTotp(decryptSecret(cred.totpSecretEnc!), totp);
    if (!ok) {
      await this.registerFailure(userId, cred.failedAttempts);
      throw new ForbiddenException('Invalid current passphrase or authenticator code');
    }
    await this.db
      .update(secretManagerCredentials)
      .set({ passphraseHash: await bcrypt.hash(next, BCRYPT_ROUNDS), updatedAt: new Date() })
      .where(eq(secretManagerCredentials.userId, userId));
    await this.audit(userId, 'vault.passphrase_changed');
    return { changed: true };
  }

  // ---------- recovery (dual-channel OTP) ----------

  async requestRecovery(userId: string) {
    const cred = await this.getCredential(userId);
    if (!cred || !cred.recoveryEmail || !cred.recoveryMobile) {
      throw new BadRequestException('Vault not set up with recovery contacts');
    }

    const emailOtp = generateOtp(6);
    const mobileOtp = generateOtp(6);
    await this.redis.set(`vault:rec:email:${userId}`, emailOtp, 'EX', OTP_TTL_SECONDS);
    await this.redis.set(`vault:rec:mobile:${userId}`, mobileOtp, 'EX', OTP_TTL_SECONDS);

    // Email OTP via SES (admin-service already wires SesService).
    try {
      await this.ses.sendEmail({
        to: cred.recoveryEmail,
        subject: 'Secret Manager passphrase reset code',
        html: `<p>Your Secret Manager email verification code is:</p>
               <h2 style="letter-spacing:4px">${emailOtp}</h2>
               <p>It expires in 10 minutes. You must also enter the code sent to your mobile.</p>
               <p>If you did not request this, contact your administrator immediately.</p>`,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send recovery email: ${err.message}`);
    }

    // Mobile OTP via the notification pipeline (SQS -> notification-service).
    // NOTE (Phase 1): the SMS consumer/type may need wiring in notification-service before this
    // delivers in production. In non-production we log the code so the flow is testable.
    try {
      await this.sqs.sendNotification('SECRET_MANAGER_SMS_OTP', {
        userId,
        mobile: cred.recoveryMobile,
        otp: mobileOtp,
      });
    } catch (err: any) {
      this.logger.error(`Failed to enqueue recovery SMS: ${err.message}`);
    }
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.warn(`[DEV] Recovery mobile OTP for ${userId}: ${mobileOtp}`);
    }

    await this.audit(userId, 'vault.recovery_requested');

    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      message: 'Verification codes sent to your recovery email and mobile.',
      email: this.maskEmail(cred.recoveryEmail),
      mobile: this.maskMobile(cred.recoveryMobile),
      // DEV-ONLY: expose the OTPs so the flow is testable without real email/SMS delivery.
      // Never returned when NODE_ENV=production.
      ...(isProd ? {} : { devEmailOtp: emailOtp, devMobileOtp: mobileOtp }),
    };
  }

  async confirmRecovery(
    userId: string,
    emailOtp: string,
    mobileOtp: string,
    newPassphrase: string,
  ) {
    const cred = await this.getCredential(userId);
    if (!cred) {
      throw new BadRequestException('Vault not set up');
    }
    const [storedEmail, storedMobile] = await Promise.all([
      this.redis.get(`vault:rec:email:${userId}`),
      this.redis.get(`vault:rec:mobile:${userId}`),
    ]);
    if (!storedEmail || !storedMobile || storedEmail !== emailOtp || storedMobile !== mobileOtp) {
      await this.audit(userId, 'vault.recovery_failed');
      throw new ForbiddenException('Invalid or expired recovery codes');
    }

    await this.db
      .update(secretManagerCredentials)
      .set({
        passphraseHash: await bcrypt.hash(newPassphrase, BCRYPT_ROUNDS),
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(secretManagerCredentials.userId, userId));

    await this.redis.del(`vault:rec:email:${userId}`, `vault:rec:mobile:${userId}`);
    await this.audit(userId, 'vault.recovery_completed');

    // Notify the owner that the passphrase was reset.
    try {
      await this.ses.sendEmail({
        to: cred.recoveryEmail!,
        subject: 'Secret Manager passphrase was reset',
        html: `<p>Your Secret Manager passphrase was just reset. If this wasn't you, contact your administrator immediately.</p>`,
      });
    } catch {
      // best effort
    }
    return { reset: true };
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return '••••';
    const head = user.slice(0, 2);
    return `${head}${'•'.repeat(Math.max(2, user.length - 2))}@${domain}`;
  }

  private maskMobile(mobile: string): string {
    return mobile.length > 4 ? `${'•'.repeat(mobile.length - 4)}${mobile.slice(-4)}` : '••••';
  }
}
