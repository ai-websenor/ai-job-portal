import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, isNull, isNotNull, desc, and, sql, ilike } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, jobCategories, jobs } from '@ai-job-portal/database';
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
      where: and(eq(jobCategories.isActive, true), eq(jobCategories.type, 'master-typed')),
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
    const slug = dto.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const [category] = await this.db
      .insert(jobCategories)
      .values({
        name: dto.name,
        slug: `${slug}-${Date.now()}`,
        description: dto.description,
        parentId: dto.parentId,
        type: 'master-typed',
        isActive: true,
      })
      .returning();

    await this.clearDropdownCaches();
    return category;
  }

  async update(
    id: string,
    dto: {
      name?: string;
      description?: string;
      isActive?: boolean;
      parentId?: string;
      type?: 'master-typed' | 'user-typed';
    },
  ) {
    await this.db
      .update(jobCategories)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(jobCategories.id, id));

    await this.clearDropdownCaches();
    return this.findById(id);
  }

  /**
   * Admin: paginated list of categories (master + user-typed), active only.
   * Used by the admin master-data review screen to promote employer-typed
   * Industries/Departments (type='user-typed') into the master dropdowns.
   */
  async getAllAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'master-typed' | 'user-typed';
    level?: 'parent' | 'child';
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const offset = (page - 1) * limit;

    let whereClause: any = eq(jobCategories.isActive, true);
    if (query.type) whereClause = and(whereClause, eq(jobCategories.type, query.type));
    if (query.level === 'parent') whereClause = and(whereClause, isNull(jobCategories.parentId));
    else if (query.level === 'child')
      whereClause = and(whereClause, isNotNull(jobCategories.parentId));
    if (query.search)
      whereClause = and(whereClause, ilike(jobCategories.name, `%${query.search}%`));

    const [rows, total] = await Promise.all([
      this.db.query.jobCategories.findMany({
        where: whereClause,
        orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobCategories)
        .where(whereClause)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Find or create a parent Industry as user-typed.
   * Used when an employer types a custom Industry not in the master dropdown.
   */
  async findOrCreateIndustry(name: string) {
    const trimmed = name.trim();
    const existing = await this.db.query.jobCategories.findFirst({
      where: and(isNull(jobCategories.parentId), ilike(jobCategories.name, trimmed)),
    });
    if (existing) return existing;

    const [created] = await this.db
      .insert(jobCategories)
      .values({
        name: trimmed,
        slug: this.buildSlug(trimmed),
        parentId: null,
        type: 'user-typed',
        isActive: true,
      })
      .returning();
    await this.clearDropdownCaches();
    return created;
  }

  /**
   * Find or create a child Department (under a given Industry) as user-typed.
   * Used when an employer types a custom Department not in the master dropdown.
   */
  async findOrCreateDepartment(name: string, parentId: string) {
    const trimmed = name.trim();
    const existing = await this.db.query.jobCategories.findFirst({
      where: and(eq(jobCategories.parentId, parentId), ilike(jobCategories.name, trimmed)),
    });
    if (existing) return existing;

    const [created] = await this.db
      .insert(jobCategories)
      .values({
        name: trimmed,
        slug: this.buildSlug(trimmed),
        parentId,
        type: 'user-typed',
        isActive: true,
      })
      .returning();
    await this.clearDropdownCaches();
    return created;
  }

  private buildSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `${base}-${Date.now()}`;
  }

  private async clearDropdownCaches() {
    const keys = await this.redis.keys('job:categories*');
    if (keys.length) await this.redis.del(...keys);
  }

  /**
   * Get only parent categories (where parentId is null)
   * Used for the Category dropdown in job creation
   */
  async getParentCategories() {
    const cacheKey = 'job:categories:parents';

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const categories = await this.db.query.jobCategories.findMany({
      where: and(
        isNull(jobCategories.parentId),
        eq(jobCategories.isActive, true),
        eq(jobCategories.type, 'master-typed'),
      ),
      orderBy: [desc(jobCategories.displayOrder), desc(jobCategories.name)],
    });

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(categories));
    return categories;
  }

  /**
   * Get subcategories for a specific parent category
   * Used for the Subcategory dropdown in job creation
   */
  async getSubcategories(parentId: string) {
    const cacheKey = `job:categories:${parentId}:subcategories`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const subcategories = await this.db.query.jobCategories.findMany({
      where: and(
        eq(jobCategories.parentId, parentId),
        eq(jobCategories.isActive, true),
        eq(jobCategories.type, 'master-typed'),
      ),
      orderBy: [desc(jobCategories.displayOrder), desc(jobCategories.name)],
    });

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(subcategories));
    return subcategories;
  }

  /**
   * Get top 6 categories (parent only) with the most active jobs
   */
  async getTopCategories(limit = 6) {
    const cacheKey = `job:categories:top:${limit}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.db
      .select({
        id: jobCategories.id,
        name: jobCategories.name,
        slug: jobCategories.slug,
        icon: jobCategories.icon,
        jobCount: sql<number>`count(${jobs.id})`.as('job_count'),
      })
      .from(jobCategories)
      .innerJoin(jobs, eq(jobs.categoryId, jobCategories.id))
      .where(
        and(
          isNull(jobCategories.parentId),
          eq(jobCategories.isActive, true),
          eq(jobCategories.type, 'master-typed'),
          eq(jobs.status, 'active'),
        ),
      )
      .groupBy(jobCategories.id, jobCategories.name, jobCategories.slug, jobCategories.icon)
      .orderBy(sql`count(${jobs.id}) DESC`)
      .limit(limit);

    const data = result.map((r) => ({
      ...r,
      jobCount: Number(r.jobCount),
    }));

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
    return data;
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
