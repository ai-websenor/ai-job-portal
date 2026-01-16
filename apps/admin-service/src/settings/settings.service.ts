import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { UpdateSettingDto, BulkUpdateSettingsDto, FeatureFlagDto } from './dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly CACHE_PREFIX = 'settings:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // System Settings - using Redis for storage
  async getSetting(key: string) {
    const cached = await this.redis.get(`${this.CACHE_PREFIX}${key}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return cached;
      }
    }
    return null;
  }

  async getAllSettings() {
    const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    const settings: Record<string, any> = {};

    for (const key of keys) {
      const value = await this.redis.get(key);
      const settingKey = key.replace(this.CACHE_PREFIX, '');
      try {
        settings[settingKey] = value ? JSON.parse(value) : null;
      } catch {
        settings[settingKey] = value;
      }
    }

    return settings;
  }

  async updateSetting(dto: UpdateSettingDto) {
    const value = typeof dto.value === 'string' ? dto.value : JSON.stringify(dto.value);
    await this.redis.set(`${this.CACHE_PREFIX}${dto.key}`, value);
    return { key: dto.key, value: dto.value };
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
    await this.redis.del(`${this.CACHE_PREFIX}${key}`);
    return { success: true };
  }

  // Feature Flags
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
