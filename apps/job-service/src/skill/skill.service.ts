import { Injectable, Inject } from '@nestjs/common';
import { eq, ilike, or } from 'drizzle-orm';
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
      where: or(
        ilike(skills.name, `%${query}%`),
        ilike(skills.slug, `%${query}%`),
      ),
      limit,
    });

    await this.redis.setex(cacheKey, 300, JSON.stringify(results));
    return results;
  }

  async findAll(categoryId?: string) {
    if (categoryId) {
      return this.db.query.skills.findMany({
        where: eq(skills.categoryId, categoryId),
      });
    }
    return this.db.query.skills.findMany({ limit: 100 });
  }

  async findById(id: string) {
    return this.db.query.skills.findFirst({
      where: eq(skills.id, id),
    });
  }

  async create(dto: { name: string; categoryId?: string }) {
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-');

    const [skill] = await this.db.insert(skills).values({
      name: dto.name,
      slug,
      categoryId: dto.categoryId,
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
