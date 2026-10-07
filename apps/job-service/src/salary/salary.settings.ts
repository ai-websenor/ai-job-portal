/**
 * Reads the AI salary settings an admin controls from the admin panel.
 *
 * The settings live in the shared `platform_settings` table, which is how every
 * other platform-wide switch is already stored. Services do not call each other
 * in this architecture — they share the database — so job-service reads the
 * rows directly rather than asking admin-service for them.
 *
 * Cached for a minute. A toggle an admin flips should take effect while they are
 * still looking at the screen, but it must not mean a settings query on every
 * keystroke of an employer filling in a job form.
 */

import { Inject, Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { AI_SETTING_KEYS } from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { Database, platformSettings } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

// Shared with admin-service, which writes these rows. A local copy of the key
// strings would mean a typo on either side reads as "setting permanently off".
const { SALARY_EXTERNAL_SOURCE_ENABLED, SALARY_EXTERNAL_SOURCE_PROVIDER } = AI_SETTING_KEYS;

const CACHE_TTL_MS = 60 * 1000;

export interface ExternalSalarySourceSettings {
  enabled: boolean;
  provider: string | null;
}

/** Off and unset — what we assume whenever the settings cannot be read. */
const SAFE_DEFAULT: ExternalSalarySourceSettings = { enabled: false, provider: null };

@Injectable()
export class SalarySettingsService {
  private readonly logger = new CustomLogger();

  private cache: { at: number; value: ExternalSalarySourceSettings } | null = null;

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async externalSource(): Promise<ExternalSalarySourceSettings> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) return this.cache.value;

    let value = SAFE_DEFAULT;
    try {
      const rows = await this.db
        .select({ key: platformSettings.key, value: platformSettings.value })
        .from(platformSettings)
        .where(
          inArray(platformSettings.key, [
            SALARY_EXTERNAL_SOURCE_ENABLED,
            SALARY_EXTERNAL_SOURCE_PROVIDER,
          ]),
        );

      const byKey = new Map(rows.map((row) => [row.key, String(row.value ?? '').trim()]));
      const provider = byKey.get(SALARY_EXTERNAL_SOURCE_PROVIDER) ?? '';

      value = {
        enabled: (byKey.get(SALARY_EXTERNAL_SOURCE_ENABLED) ?? '').toLowerCase() === 'true',
        provider: provider || null,
      };
    } catch (error) {
      // A settings table that cannot be read must not break posting a job. The
      // safe default is "fallback off", which is also the current behaviour, so
      // the worst case is an employer seeing "not enough data" — which is the
      // truthful answer anyway.
      this.logger.log(`AI salary settings unavailable, assuming off: ${(error as Error).message}`);
    }

    this.cache = { at: now, value };
    return value;
  }

  /** Drop the cached settings — used by tests and after an admin update. */
  clearCache(): void {
    this.cache = null;
  }
}
