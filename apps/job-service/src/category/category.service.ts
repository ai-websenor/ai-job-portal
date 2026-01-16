import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, isNull, desc } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, jobCategories } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class CategoryService {
  private readonly CACHE_KEY = 'job:categories';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findAll() {
    // Check cache
    const cached = await this.redis.get(this.CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const categories = await this.db.query.jobCategories.findMany({
      where: eq(jobCategories.isActive, true),
      orderBy: [desc(jobCategories.createdAt)],
    });

    // Build tree structure
    const tree = this.buildTree(categories);

    await this.redis.setex(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(tree));
    return tree;
  }

  async findById(id: string) {
    const category = await this.db.query.jobCategories.findFirst({
      where: eq(jobCategories.id, id),
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.db.query.jobCategories.findFirst({
      where: eq(jobCategories.slug, slug),
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: { name: string; description?: string; parentId?: string }) {
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const [category] = await this.db.insert(jobCategories).values({
      name: dto.name,
      slug: `${slug}-${Date.now()}`,
      description: dto.description,
      parentId: dto.parentId,
    }).returning();

    await this.redis.del(this.CACHE_KEY);
    return category;
  }

  async update(id: string, dto: { name?: string; description?: string; isActive?: boolean }) {
    await this.db.update(jobCategories)
      .set(dto)
      .where(eq(jobCategories.id, id));

    await this.redis.del(this.CACHE_KEY);
    return this.findById(id);
  }

  private buildTree(categories: any[]) {
    const map = new Map();
    const roots: any[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return roots;
  }
}
