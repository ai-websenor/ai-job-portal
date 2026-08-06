import { Injectable, Inject, Logger } from '@nestjs/common';
import { inArray, sql } from 'drizzle-orm';
import { Database, platformSettings } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { UpdateInvoiceConfigDto } from './dto';

/** Maps DTO fields to platform_settings DB keys (must match payment-service INVOICE_SETTING_KEYS) */
const INVOICE_KEYS: Record<keyof UpdateInvoiceConfigDto, string> = {
  platformName: 'invoice_platform_name',
  platformAddress: 'invoice_platform_address',
  platformGstNumber: 'invoice_platform_gst_number',
  platformStateCode: 'invoice_platform_state_code',
  defaultHsnCode: 'invoice_default_hsn_code',
};

@Injectable()
export class PlatformConfigService {
  private readonly logger = new Logger(PlatformConfigService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getInvoiceConfig(): Promise<Record<string, string>> {
    const keys = Object.values(INVOICE_KEYS);

    const rows = await this.db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(inArray(platformSettings.key, keys));

    const lookup: Record<string, string> = {};
    for (const row of rows) {
      lookup[row.key] = row.value;
    }

    // Map back to DTO field names
    const result: Record<string, string> = {};
    for (const [field, dbKey] of Object.entries(INVOICE_KEYS)) {
      result[field] = lookup[dbKey] || '';
    }

    return result;
  }

  async updateInvoiceConfig(dto: UpdateInvoiceConfigDto): Promise<Record<string, string>> {
    const updates: { field: string; dbKey: string; value: string }[] = [];

    for (const [field, dbKey] of Object.entries(INVOICE_KEYS)) {
      const value = dto[field as keyof UpdateInvoiceConfigDto];
      if (value !== undefined) {
        updates.push({ field, dbKey, value });
      }
    }

    if (updates.length > 0) {
      // platformSettings.key is unique, so a single upsert replaces the
      // previous per-key findFirst + insert/update loop.
      await this.db
        .insert(platformSettings)
        .values(
          updates.map(({ dbKey, value }) => ({
            key: dbKey,
            value,
            dataType: 'string',
            category: 'invoice',
            description: `Invoice config: ${dbKey}`,
          })) as any,
        )
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: sql`excluded.value`, updatedAt: new Date() } as any,
        });
    }

    this.logger.log(`Updated ${updates.length} invoice config settings`);

    return this.getInvoiceConfig();
  }
}
