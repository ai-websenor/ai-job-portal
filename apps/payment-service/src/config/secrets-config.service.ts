import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Database, managedSecrets } from '@ai-job-portal/database';
import { decryptSecret } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';

/**
 * Phase-2 secret resolution for Tier-2 integration credentials.
 *
 * Order of precedence: value stored in the admin Secret Manager vault
 * (`managed_secrets`, encrypted) wins; otherwise falls back to `process.env`
 * via ConfigService. Values are cached for the lifetime of the process, so a
 * key saved in the admin panel takes effect on the next service restart
 * (restart-required mode — no live cache invalidation).
 *
 * Requires `SECRETS_MASTER_KEY` in this service's env (same value as the
 * admin-service) to decrypt vault values.
 */
@Injectable()
export class SecretsConfigService {
  private readonly logger = new Logger(SecretsConfigService.name);
  private readonly cache = new Map<string, string | undefined>();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolve a Tier-2 secret: vault first, then env. Cached permanently.
   * Returns undefined if set in neither place.
   */
  async get(key: string): Promise<string | undefined> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    let value: string | undefined;
    try {
      const row = await this.db.query.managedSecrets.findFirst({
        where: eq(managedSecrets.key, key),
      });
      if (row?.isSet && row.valueEnc) {
        value = decryptSecret(row.valueEnc);
        this.logger.log(`Resolved "${key}" from vault`);
      }
    } catch (err: any) {
      // Fail safe: if the vault row is unreadable (bad master key, tampered
      // ciphertext, DB error) fall back to env rather than crash the service.
      this.logger.warn(`Vault lookup for "${key}" failed, falling back to env: ${err.message}`);
    }

    if (value === undefined) {
      value = this.configService.get<string>(key);
    }

    this.cache.set(key, value);
    return value;
  }
}
