import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

const ONLINE_KEY_PREFIX = 'user:online:';
const ONLINE_TTL = 300; // 5 minutes

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async setOnline(userId: string, socketId: string): Promise<void> {
    await this.redis.set(`${ONLINE_KEY_PREFIX}${userId}`, socketId, 'EX', ONLINE_TTL);
  }

  async refreshOnline(userId: string): Promise<void> {
    await this.redis.expire(`${ONLINE_KEY_PREFIX}${userId}`, ONLINE_TTL);
  }

  async setOffline(userId: string): Promise<void> {
    await this.redis.del(`${ONLINE_KEY_PREFIX}${userId}`);
  }

  async isOnline(userId: string): Promise<boolean> {
    const result = await this.redis.exists(`${ONLINE_KEY_PREFIX}${userId}`);
    return result === 1;
  }

  async getOnlineStatus(userIds: string[]): Promise<Record<string, boolean>> {
    if (!userIds.length) return {};

    const uniqueIds = [...new Set(userIds)];
    const keys = uniqueIds.map((id) => `${ONLINE_KEY_PREFIX}${id}`);
    const results = await this.redis.mget(...keys);

    const statusMap: Record<string, boolean> = {};
    uniqueIds.forEach((id, index) => {
      statusMap[id] = results[index] !== null;
    });

    return statusMap;
  }

  async getSocketId(userId: string): Promise<string | null> {
    return this.redis.get(`${ONLINE_KEY_PREFIX}${userId}`);
  }
}
