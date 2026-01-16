import { Injectable, Inject } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, skills } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class SkillService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async search(query: string, limit: number = 20) {
    const cacheKey = `skills:search:${query}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const results = await this.db.query.skills.findMany({
      where: ilike(skills.name, `%${query}%`),
      limit,
    });

    await this.redis.setex(cacheKey, 300, JSON.stringify(results));
    return results;
  }

  async findAll(category?: string) {
    if (category) {
      return this.db.query.skills.findMany({
        where: eq(skills.category, category as any),
      });
    }
    return this.db.query.skills.findMany({ limit: 100 });
  }

  async findById(id: string) {
    return this.db.query.skills.findFirst({
      where: eq(skills.id, id),
    });
  }

  async create(dto: { name: string; category: string }) {
    const [skill] = await this.db.insert(skills).values({
      name: dto.name,
      category: dto.category as any,
    }).returning();

    return skill;
  }

  async getPopularSkills(limit: number = 20) {
    const cacheKey = 'skills:popular';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // In production, this would order by usage count
    const results = await this.db.query.skills.findMany({ limit });

    await this.redis.setex(cacheKey, 3600, JSON.stringify(results));
    return results;
  }
}
