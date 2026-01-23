import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, ilike, desc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, jobs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SearchJobsDto } from './dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async searchJobs(dto: SearchJobsDto) {
    const conditions: any[] = [eq(jobs.isActive, true)];

    // Text search using PostgreSQL full-text search
    if (dto.query) {
      conditions.push(
        or(ilike(jobs.title, `%${dto.query}%`), ilike(jobs.description, `%${dto.query}%`)),
      );
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.employmentTypes?.length) {
      conditions.push(or(...dto.employmentTypes.map((t) => eq(jobs.employmentType, t as any))));
    }

    if (dto.workModes?.length) {
      // Use PostgreSQL array overlap operator to check if job's workMode array overlaps with searched modes
      conditions.push(
        sql`${jobs.workMode} && ARRAY[${sql.join(
          dto.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(or(...dto.experienceLevels.map((l) => eq(jobs.experienceLevel, l as any))));
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.location) {
      conditions.push(
        or(
          ilike(jobs.city, `%${dto.location}%`),
          ilike(jobs.state, `%${dto.location}%`),
          ilike(jobs.country, `%${dto.location}%`),
          ilike(jobs.location, `%${dto.location}%`),
        ),
      );
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    // Determine sort order
    let orderBy: any;
    switch (dto.sortBy) {
      case 'salary':
        orderBy = desc(jobs.salaryMax);
        break;
      case 'date':
      default:
        orderBy = desc(jobs.createdAt);
    }

    const results = await this.db.query.jobs.findMany({
      where: and(...conditions),
      with: {
        employer: true,
        category: true,
      },
      orderBy: [orderBy],
      limit,
      offset,
    });

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSimilarJobs(jobId: string, limit: number = 5) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) return [];

    // Find jobs in same category or with similar title
    return this.db.query.jobs.findMany({
      where: and(
        eq(jobs.isActive, true),
        or(eq(jobs.categoryId, job.categoryId!), ilike(jobs.title, `%${job.title.split(' ')[0]}%`)),
        sql`${jobs.id} != ${jobId}`,
      ),
      with: { employer: true },
      limit,
    });
  }

  async getFeaturedJobs(limit: number = 10) {
    const cacheKey = 'jobs:featured';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const results = await this.db.query.jobs.findMany({
      where: and(eq(jobs.isActive, true), eq(jobs.isFeatured, true)),
      with: { employer: true, category: true },
      orderBy: [desc(jobs.createdAt)],
      limit,
    });

    await this.redis.setex(cacheKey, 300, JSON.stringify(results));
    return results;
  }

  async getRecentJobs(limit: number = 20) {
    return this.db.query.jobs.findMany({
      where: eq(jobs.isActive, true),
      with: { employer: true, category: true },
      orderBy: [desc(jobs.createdAt)],
      limit,
    });
  }
}
