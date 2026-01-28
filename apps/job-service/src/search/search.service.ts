import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, ilike, desc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, jobs, employers, companies } from '@ai-job-portal/database';
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

    // Job title filter (case-insensitive, partial match)
    if (dto.title) {
      conditions.push(ilike(jobs.title, `%${dto.title}%`));
    }

    // Company name filter (case-insensitive, partial match via subquery)
    if (dto.company) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND LOWER(c.name) LIKE LOWER(${`%${dto.company}%`})
        )`,
      );
    }

    // Industry filter (exact or IN match)
    if (dto.industry) {
      const industries = dto.industry.split(',').map((i) => i.trim());
      if (industries.length === 1) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${employers} e
            JOIN ${companies} c ON e.company_id = c.id
            WHERE e.id = ${jobs.employerId}
            AND LOWER(c.industry) = LOWER(${industries[0]})
          )`,
        );
      } else {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${employers} e
            JOIN ${companies} c ON e.company_id = c.id
            WHERE e.id = ${jobs.employerId}
            AND LOWER(c.industry) IN (${sql.join(
              industries.map((i) => sql`LOWER(${i})`),
              sql`, `,
            )})
          )`,
        );
      }
    }

    // Company type filter (exact match)
    if (dto.companyType) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND c.company_type = ${dto.companyType}
        )`,
      );
    }

    // Posted within filter (date of posting)
    if (dto.postedWithin && dto.postedWithin !== 'all') {
      let daysAgo: number;
      switch (dto.postedWithin) {
        case '24h':
          daysAgo = 1;
          break;
        case '3d':
          daysAgo = 3;
          break;
        case '7d':
          daysAgo = 7;
          break;
        default:
          daysAgo = 0;
      }
      if (daysAgo > 0) {
        conditions.push(
          sql`${jobs.createdAt} >= NOW() - INTERVAL '${sql.raw(String(daysAgo))} days'`,
        );
      }
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

    const totalPages = Math.ceil(total / limit);
    return {
      data: results,
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
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

  async getPopularJobs(dto: SearchJobsDto) {
    const conditions: any[] = [eq(jobs.isActive, true)];

    // Apply same filters as searchJobs
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

    // Job title filter (case-insensitive, partial match)
    if (dto.title) {
      conditions.push(ilike(jobs.title, `%${dto.title}%`));
    }

    // Company name filter (case-insensitive, partial match via subquery)
    if (dto.company) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND LOWER(c.name) LIKE LOWER(${`%${dto.company}%`})
        )`,
      );
    }

    // Industry filter (exact or IN match)
    if (dto.industry) {
      const industries = dto.industry.split(',').map((i) => i.trim());
      if (industries.length === 1) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${employers} e
            JOIN ${companies} c ON e.company_id = c.id
            WHERE e.id = ${jobs.employerId}
            AND LOWER(c.industry) = LOWER(${industries[0]})
          )`,
        );
      } else {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${employers} e
            JOIN ${companies} c ON e.company_id = c.id
            WHERE e.id = ${jobs.employerId}
            AND LOWER(c.industry) IN (${sql.join(
              industries.map((i) => sql`LOWER(${i})`),
              sql`, `,
            )})
          )`,
        );
      }
    }

    // Company type filter (exact match)
    if (dto.companyType) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND c.company_type = ${dto.companyType}
        )`,
      );
    }

    // Posted within filter (date of posting)
    if (dto.postedWithin && dto.postedWithin !== 'all') {
      let daysAgo: number;
      switch (dto.postedWithin) {
        case '24h':
          daysAgo = 1;
          break;
        case '3d':
          daysAgo = 3;
          break;
        case '7d':
          daysAgo = 7;
          break;
        default:
          daysAgo = 0;
      }
      if (daysAgo > 0) {
        conditions.push(
          sql`${jobs.createdAt} >= NOW() - INTERVAL '${sql.raw(String(daysAgo))} days'`,
        );
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    // Get popular jobs ordered by engagement score
    // Score: (applicationCount * 5) + (viewCount * 2), then by recency
    const results = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(
        sql`(COALESCE(${jobs.applicationCount}, 0) * 5 + COALESCE(${jobs.viewCount}, 0) * 2) DESC`,
        desc(jobs.createdAt),
      )
      .limit(limit)
      .offset(offset);

    // Fetch related data for results
    const jobIds = results.map((j) => j.id);
    let jobsWithRelations: any[] = [];

    if (jobIds.length > 0) {
      jobsWithRelations = await this.db.query.jobs.findMany({
        where: sql`${jobs.id} IN (${sql.join(
          jobIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        with: { employer: true, category: true },
      });

      // Maintain popularity order from original query
      const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));
      jobsWithRelations = jobIds.map((id) => jobMap.get(id)).filter(Boolean);
    }

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    const totalPages = Math.ceil(total / limit);
    return {
      data: jobsWithRelations,
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getTrendingJobs(dto: SearchJobsDto) {
    // Time window for trending: last 7 days
    const trendingDays = 7;
    const trendingCutoff = new Date();
    trendingCutoff.setDate(trendingCutoff.getDate() - trendingDays);

    const conditions: any[] = [eq(jobs.isActive, true)];

    // Filter for recent activity (jobs with activity in the trending window)
    // Use lastActivityAt if available, otherwise fall back to updatedAt
    conditions.push(
      sql`COALESCE(${jobs.lastActivityAt}, ${jobs.updatedAt}) >= ${trendingCutoff.toISOString()}`,
    );

    // Apply same filters as searchJobs
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

    // Job title filter (case-insensitive, partial match)
    if (dto.title) {
      conditions.push(ilike(jobs.title, `%${dto.title}%`));
    }

    // Company name filter (case-insensitive, partial match via subquery)
    if (dto.company) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND LOWER(c.name) LIKE LOWER(${`%${dto.company}%`})
        )`,
      );
    }

    // Industry filter (exact or IN match)
    if (dto.industry) {
      const industries = dto.industry.split(',').map((i) => i.trim());
      if (industries.length === 1) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${employers} e
            JOIN ${companies} c ON e.company_id = c.id
            WHERE e.id = ${jobs.employerId}
            AND LOWER(c.industry) = LOWER(${industries[0]})
          )`,
        );
      } else {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${employers} e
            JOIN ${companies} c ON e.company_id = c.id
            WHERE e.id = ${jobs.employerId}
            AND LOWER(c.industry) IN (${sql.join(
              industries.map((i) => sql`LOWER(${i})`),
              sql`, `,
            )})
          )`,
        );
      }
    }

    // Company type filter (exact match)
    if (dto.companyType) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND c.company_type = ${dto.companyType}
        )`,
      );
    }

    // Posted within filter (date of posting)
    if (dto.postedWithin && dto.postedWithin !== 'all') {
      let daysAgo: number;
      switch (dto.postedWithin) {
        case '24h':
          daysAgo = 1;
          break;
        case '3d':
          daysAgo = 3;
          break;
        case '7d':
          daysAgo = 7;
          break;
        default:
          daysAgo = 0;
      }
      if (daysAgo > 0) {
        conditions.push(
          sql`${jobs.createdAt} >= NOW() - INTERVAL '${sql.raw(String(daysAgo))} days'`,
        );
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    // Get trending jobs ordered by recent activity and engagement
    // Order: lastActivityAt DESC, applicationCount DESC, viewCount DESC, createdAt DESC
    const results = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(
        sql`COALESCE(${jobs.lastActivityAt}, ${jobs.updatedAt}) DESC`,
        desc(jobs.applicationCount),
        desc(jobs.viewCount),
        desc(jobs.createdAt),
      )
      .limit(limit)
      .offset(offset);

    // Fetch related data for results
    const jobIds = results.map((j) => j.id);
    let jobsWithRelations: any[] = [];

    if (jobIds.length > 0) {
      jobsWithRelations = await this.db.query.jobs.findMany({
        where: sql`${jobs.id} IN (${sql.join(
          jobIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        with: { employer: true, category: true },
      });

      // Maintain trending order from original query
      const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));
      jobsWithRelations = jobIds.map((id) => jobMap.get(id)).filter(Boolean);
    }

    // Get total count for pagination
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    const totalPages = Math.ceil(total / limit);
    return {
      data: jobsWithRelations,
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }
}
