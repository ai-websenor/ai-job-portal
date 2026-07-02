import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, managedSecrets, adminUsers, activityLogs } from '@ai-job-portal/database';
import { encryptSecret, decryptSecret, maskValue } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { SECRET_CATALOG, getSecretDef, SecretCategory } from './secret-catalog';

export interface SecretView {
  key: string;
  label: string;
  category: SecretCategory;
  isSecret: boolean;
  isSet: boolean;
  masked: string | null;
  validationStatus: string;
  lastValidatedAt: Date | null;
  updatedAt: Date | null;
}

@Injectable()
export class SecretManagerService {
  private readonly logger = new Logger(SecretManagerService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async resolveAdminUserId(userId: string): Promise<string | null> {
    const admin = await this.db.query.adminUsers.findFirst({
      where: eq(adminUsers.userId, userId),
    });
    return admin?.id ?? null;
  }

  private async audit(
    userId: string,
    action: string,
    key: string,
    details?: Record<string, unknown>,
  ) {
    try {
      await this.db.insert(activityLogs).values({
        userId,
        action,
        entityType: 'managed_secret',
        entityId: key,
        oldData: details ? JSON.stringify(details) : null,
      } as any);
    } catch (err: any) {
      this.logger.warn(`Failed to write audit log (${action} ${key}): ${err.message}`);
    }
  }

  /** Masked, grouped view of every catalog key (never returns raw values). */
  async listSecrets() {
    const rows = await this.db.select().from(managedSecrets);
    const byKey = new Map(rows.map((r) => [r.key, r]));

    const groups: Record<string, SecretView[]> = {};
    for (const def of SECRET_CATALOG) {
      const row = byKey.get(def.key);
      const view: SecretView = {
        key: def.key,
        label: def.label,
        category: def.category,
        isSecret: def.isSecret,
        isSet: row?.isSet ?? false,
        masked: row?.isSet ? maskValue(row.lastFour) : null,
        validationStatus: row?.validationStatus ?? 'unknown',
        lastValidatedAt: row?.lastValidatedAt ?? null,
        updatedAt: row?.updatedAt ?? null,
      };
      (groups[def.category] ||= []).push(view);
    }
    return groups;
  }

  /** Encrypt + upsert a single Tier-2 secret. Rejects any key outside the catalog. */
  async updateSecret(userId: string, key: string, value: string) {
    const def = getSecretDef(key);
    if (!def) {
      throw new BadRequestException(`"${key}" is not a manageable secret`);
    }
    const { packed, lastFour } = encryptSecret(value);
    const updatedBy = await this.resolveAdminUserId(userId);
    const existing = await this.db.query.managedSecrets.findFirst({
      where: eq(managedSecrets.key, key),
    });

    if (existing) {
      await this.db
        .update(managedSecrets)
        .set({
          valueEnc: packed,
          lastFour,
          isSet: true,
          validationStatus: 'unknown',
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(managedSecrets.key, key));
    } else {
      await this.db.insert(managedSecrets).values({
        key,
        category: def.category,
        label: def.label,
        isSecret: def.isSecret,
        valueEnc: packed,
        lastFour,
        isSet: true,
        updatedBy,
      });
    }

    // Audit stores only the key + last 4 — never the raw value.
    await this.audit(userId, 'secret.update', key, { lastFour });
    return { key, isSet: true, masked: maskValue(lastFour) };
  }

  /** Decrypt and return a single secret once. Caller must have passed a fresh TOTP check. */
  async revealSecret(userId: string, key: string) {
    if (!getSecretDef(key)) {
      throw new BadRequestException(`"${key}" is not a manageable secret`);
    }
    const row = await this.db.query.managedSecrets.findFirst({
      where: eq(managedSecrets.key, key),
    });
    if (!row || !row.isSet || !row.valueEnc) {
      throw new NotFoundException('Secret is not set');
    }
    const value = decryptSecret(row.valueEnc);
    await this.audit(userId, 'secret.reveal', key);
    return { key, value };
  }

  /**
   * Lightweight format validation (Phase 1). Real network checks against each provider need
   * their SDKs and live calls — deferred. Marks validationStatus so the UI can show a chip.
   */
  async testSecret(userId: string, key: string) {
    if (!getSecretDef(key)) {
      throw new BadRequestException(`"${key}" is not a manageable secret`);
    }
    const row = await this.db.query.managedSecrets.findFirst({
      where: eq(managedSecrets.key, key),
    });
    if (!row || !row.isSet || !row.valueEnc) {
      throw new NotFoundException('Secret is not set');
    }
    const value = decryptSecret(row.valueEnc);
    const valid = this.validateFormat(key, value);
    const status = valid ? 'valid' : 'invalid';
    await this.db
      .update(managedSecrets)
      .set({ validationStatus: status, lastValidatedAt: new Date(), updatedAt: new Date() })
      .where(eq(managedSecrets.key, key));
    await this.audit(userId, 'secret.test', key, { status });
    return { key, validationStatus: status };
  }

  private validateFormat(key: string, value: string): boolean {
    const v = value.trim();
    if (!v) return false;
    switch (key) {
      case 'STRIPE_SECRET_KEY':
        return /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(v);
      case 'STRIPE_PUBLISHABLE_KEY':
        return /^pk_(test|live)_[A-Za-z0-9]+$/.test(v);
      case 'STRIPE_WEBHOOK_SECRET':
        return v.startsWith('whsec_');
      case 'SES_FROM_EMAIL':
        return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
      case 'FIREBASE_PRIVATE_KEY':
        return v.includes('BEGIN PRIVATE KEY');
      default:
        // Unknown-format keys: accept any non-empty value.
        return true;
    }
  }
}
