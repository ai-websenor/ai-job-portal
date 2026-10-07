import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import {
  AI_SETTINGS_CATEGORY,
  AI_SETTING_KEYS,
  EXTERNAL_SALARY_SOURCES,
  isKnownExternalSalarySource,
} from '@ai-job-portal/common';
import { CustomLogger } from '@ai-job-portal/logger';
import {
  Database,
  adminUsers,
  jobs,
  platformSettings,
  salaryBenchmarks,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { UpdateAiSalarySourceDto } from './dto';

const { SALARY_EXTERNAL_SOURCE_ENABLED, SALARY_EXTERNAL_SOURCE_PROVIDER } = AI_SETTING_KEYS;

export interface AiSettingsOverview {
  salaryExternalSource: {
    enabled: boolean;
    provider: string | null;
    /** False when `provider` names something that has not been built. */
    providerAvailable: boolean;
    /** Only true when the fallback would actually be consulted. */
    active: boolean;
    availableProviders: readonly { id: string; label: string }[];
    updatedAt: Date | null;
  };
  /**
   * How well the platform can price jobs from its own data. The whole point of
   * the fallback is the case where these numbers are near zero, so an admin
   * deciding whether to switch it on needs to see them on the same screen.
   */
  platformData: {
    pricedActiveJobs: number;
    benchmarkRows: number;
    canPriceFromPlatformData: boolean;
  };
}

/**
 * Comparables the estimator needs before it will show a range. Mirrors
 * `MIN_SAMPLE` in `apps/job-service/src/salary/salary.service.ts` — it is
 * duplicated rather than shared because it is used here only to colour an
 * admin's "is there enough data?" readout, not to make a pricing decision.
 */
const MIN_SAMPLE = 8;

/**
 * AI settings an admin controls from the panel.
 *
 * Stored in `platform_settings`, the existing key/value table, under category
 * `ai`. Note this is a different store from `SettingsService`, which keeps its
 * settings in Redis: a flag that decides whether employers are shown salary
 * figures from a paid third party needs to survive a cache flush and carry a
 * record of who changed it.
 */
@Injectable()
export class AiSettingsService {
  private readonly logger = new CustomLogger();

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /** Current settings, plus the context needed to judge them. */
  async overview(): Promise<AiSettingsOverview> {
    const [settings, platformData] = await Promise.all([
      this.readSalarySourceSettings(),
      this.readPlatformDataHealth(),
    ]);

    const providerAvailable = settings.provider
      ? isKnownExternalSalarySource(settings.provider)
      : false;

    return {
      salaryExternalSource: {
        enabled: settings.enabled,
        provider: settings.provider,
        providerAvailable,
        // Enabled alone changes nothing. Reporting it as "on" when no provider
        // exists would tell an admin the cold-start problem is solved when it
        // is not.
        active: settings.enabled && providerAvailable,
        availableProviders: EXTERNAL_SALARY_SOURCES,
        updatedAt: settings.updatedAt,
      },
      platformData,
    };
  }

  /**
   * Turn the fallback on or off, and choose the source.
   *
   * `userId` is the `sub` from the caller's JWT. It is recorded against the rows
   * so the decision to start sending job details to a third party is
   * attributable.
   */
  async updateSalarySource(
    dto: UpdateAiSalarySourceDto,
    userId?: string,
  ): Promise<AiSettingsOverview> {
    if (dto.enabled === undefined && dto.provider === undefined) {
      throw new BadRequestException('Send at least one of "enabled" or "provider"');
    }

    const provider = dto.provider?.trim();

    // An empty string is how you deselect. Anything else must be real — saving
    // a name with nothing behind it would leave the panel reading "on" while
    // employers still see "not enough data".
    if (provider && !isKnownExternalSalarySource(provider)) {
      const known = EXTERNAL_SALARY_SOURCES.map((source) => source.id);
      throw new BadRequestException(
        known.length
          ? `Unknown external salary source "${provider}". Available: ${known.join(', ')}`
          : `No external salary source has been built yet, so none can be selected. ` +
              `Leave this empty.`,
      );
    }

    // `platform_settings.updated_by` points at `admin_users.id`, which is not
    // the id in the JWT — that is the auth-service user id. Writing the token's
    // `sub` straight in would be a foreign key violation, so it is translated
    // first, the same way secret-manager does it.
    const adminId = await this.resolveAdminUserId(userId);

    if (dto.provider !== undefined) {
      await this.writeSetting(SALARY_EXTERNAL_SOURCE_PROVIDER, provider ?? '', 'string', adminId);
    }

    if (dto.enabled !== undefined) {
      await this.writeSetting(
        SALARY_EXTERNAL_SOURCE_ENABLED,
        dto.enabled ? 'true' : 'false',
        'boolean',
        adminId,
      );
    }

    this.logger.log(
      `AI salary external source updated by admin ${adminId ?? userId ?? 'unknown'}: ` +
        `${JSON.stringify(dto)}`,
    );

    // job-service caches these for a minute, so the change takes effect there
    // within 60 seconds. Returning the fresh overview means the panel shows the
    // saved state rather than what it optimistically assumed.
    return this.overview();
  }

  // -- storage -------------------------------------------------------

  /** The `admin_users` row for a JWT subject, or null when there isn't one. */
  private async resolveAdminUserId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    const [admin] = await this.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.userId, userId))
      .limit(1);
    return admin?.id ?? null;
  }

  private async readSalarySourceSettings(): Promise<{
    enabled: boolean;
    provider: string | null;
    updatedAt: Date | null;
  }> {
    const rows = await this.db
      .select({
        key: platformSettings.key,
        value: platformSettings.value,
        updatedAt: platformSettings.updatedAt,
      })
      .from(platformSettings)
      .where(eq(platformSettings.category, AI_SETTINGS_CATEGORY));

    const byKey = new Map(rows.map((row) => [row.key, row]));
    const enabled = byKey.get(SALARY_EXTERNAL_SOURCE_ENABLED);
    const provider = byKey.get(SALARY_EXTERNAL_SOURCE_PROVIDER);

    const timestamps = [enabled?.updatedAt, provider?.updatedAt].filter(
      (value): value is Date => value instanceof Date,
    );

    return {
      enabled: String(enabled?.value ?? '').toLowerCase() === 'true',
      provider: String(provider?.value ?? '').trim() || null,
      updatedAt: timestamps.length
        ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
        : null,
    };
  }

  /**
   * Upsert one setting.
   *
   * The migration seeds both rows, so in practice this is always an update. The
   * insert branch exists so a database restored without the seed still works
   * rather than silently saving nothing.
   */
  private async writeSetting(
    key: string,
    value: string,
    dataType: 'string' | 'boolean',
    adminId: string | null,
  ): Promise<void> {
    await this.db
      .insert(platformSettings)
      .values({
        key,
        value,
        dataType,
        category: AI_SETTINGS_CATEGORY,
        isPublic: false,
        updatedBy: adminId,
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value,
          updatedBy: adminId,
          updatedAt: new Date(),
        },
      });
  }

  /** Can the platform price anything from its own postings today? */
  private async readPlatformDataHealth(): Promise<AiSettingsOverview['platformData']> {
    const [pricedActiveJobs, benchmarkRows] = await Promise.all([
      this.countPricedActiveJobs(),
      this.countBenchmarkRows(),
    ]);

    return {
      pricedActiveJobs,
      benchmarkRows,
      // A rough yes/no, not a promise: eight priced jobs on the board is enough
      // to price *something*, though not necessarily the role in front of a
      // given employer.
      canPriceFromPlatformData: pricedActiveJobs >= MIN_SAMPLE || benchmarkRows > 0,
    };
  }

  private async countPricedActiveJobs(): Promise<number> {
    // The same filter the estimator's comparable pool uses, so the number an
    // admin reads is the number the estimator actually has to work with.
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(
        and(
          eq(jobs.isActive, true),
          eq(jobs.status, 'active'),
          isNotNull(jobs.salaryMin),
          isNotNull(jobs.salaryMax),
          sql`${jobs.salaryMin} > 0`,
          sql`${jobs.salaryMax} >= ${jobs.salaryMin}`,
        ),
      );
    return Number(row?.count ?? 0);
  }

  private async countBenchmarkRows(): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(salaryBenchmarks);
    return Number(row?.count ?? 0);
  }
}
