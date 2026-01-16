import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, adminSettings } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { UpdateSettingDto, BulkUpdateSettingsDto, FeatureFlagDto } from './dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly CACHE_PREFIX = 'settings:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // System Settings
  async getSetting(key: string) {
    // Check cache first
    const cached = await this.redis.get(`${this.CACHE_PREFIX}${key}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const setting = await (this.db.query as any).adminSettings.findFirst({
      where: eq(adminSettings.key, key),
    });

    if (setting) {
      await this.redis.setex(`${this.CACHE_PREFIX}${key}`, this.CACHE_TTL, JSON.stringify(setting.value));
    }

    return setting?.value;
  }

  async getAllSettings() {
    const settings = await (this.db.query as any).adminSettings.findMany();
    return settings.reduce((acc: Record<string, any>, s: any) => ({ ...acc, [s.key]: s.value }), {});
  }

  async updateSetting(dto: UpdateSettingDto) {
    const existing = await (this.db.query as any).adminSettings.findFirst({
      where: eq(adminSettings.key, dto.key),
    });

    let result;
    if (existing) {
      [result] = await this.db.update(adminSettings)
        .set({ value: dto.value, updatedAt: new Date() } as any)
        .where(eq(adminSettings.key, dto.key))
        .returning();
    } else {
      [result] = await this.db.insert(adminSettings).values({
        key: dto.key,
        value: dto.value,
      } as any).returning();
    }

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${dto.key}`);

    return result;
  }

  async bulkUpdateSettings(dto: BulkUpdateSettingsDto) {
    const results: any[] = [];

    for (const [key, value] of Object.entries(dto.settings)) {
      const result = await this.updateSetting({ key, value });
      results.push(result);
    }

    return results;
  }

  async deleteSetting(key: string) {
    await this.db.delete(adminSettings).where(eq(adminSettings.key, key));
    await this.redis.del(`${this.CACHE_PREFIX}${key}`);
    return { success: true };
  }

  // Feature Flags - stubbed (table doesn't exist, can be added later)
  async getFeatureFlag(name: string) {
    const flag = await this.getSetting(`feature:${name}`);
    return flag === 'true' || flag === true;
  }

  async getAllFeatureFlags() {
    const settings = await this.getAllSettings();
    const flags: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('feature:')) {
        flags[key.replace('feature:', '')] = value === 'true' || value === true;
      }
    }
    return flags;
  }

  async setFeatureFlag(dto: FeatureFlagDto) {
    return this.updateSetting({
      key: `feature:${dto.name}`,
      value: dto.enabled ? 'true' : 'false',
    });
  }

  async deleteFeatureFlag(name: string) {
    return this.deleteSetting(`feature:${name}`);
  }

  // Clear all caches
  async clearCache() {
    const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    return { cleared: keys.length };
  }
}
