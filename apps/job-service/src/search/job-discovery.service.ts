import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, ilike, desc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, jobs, employers, companies } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SearchJobsDto } from './dto';
import { SearchConditionBuilder } from './search-condition.builder';
import { SearchEnrichmentHelper } from './search-enrichment.helper';

// Employer fields exposed on job responses — internal columns (rbac role,
// subscription, verification/ack flags, timestamps) stay server-side
const employerPublicColumns = {
  id: true,
  userId: true,
  companyId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  phone: true,
  department: true,
  designation: true,
  profilePhoto: true,
} as const;

@Injectable()
export class JobDiscoveryService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly conditionBuilder: SearchConditionBuilder,
    private readonly enrichmentHelper: SearchEnrichmentHelper,
  ) {}

  async getSimilarJobs(jobId: string, limit: number = 5, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.enrichmentHelper.getSavedJobIds(userId),
      this.enrichmentHelper.getAppliedJobsMap(userId),
    ]);

    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) return [];

    // Find jobs in same category or with similar title
    const results = await this.db.query.jobs.findMany({
      where: and(
        eq(jobs.isActive, true),
        eq(jobs.status, 'active'),
        or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
        or(eq(jobs.categoryId, job.categoryId!), ilike(jobs.title, `%${job.title.split(' ')[0]}%`)),
        sql`${jobs.id} != ${jobId}`,
      ),
      with: {
        employer: { columns: employerPublicColumns },
        company: { columns: { id: true, name: true, logoUrl: true } },
      },
      limit,
    });

    return this.enrichmentHelper.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getFeaturedJobs(limit: number = 10, userId?: string) {
    const cacheKey = 'jobs:featured';
    const cached = await this.redis.get(cacheKey);

    let results: any[];
    if (cached) {
      results = JSON.parse(cached);
    } else {
      results = await this.db.query.jobs.findMany({
        where: and(
          eq(jobs.isActive, true),
          eq(jobs.status, 'active'),
          eq(jobs.isFeatured, true),
          or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
        ),
        with: {
          employer: { columns: employerPublicColumns },
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
        },
        orderBy: [desc(jobs.createdAt)],
        limit,
      });
      await this.redis.setex(cacheKey, 300, JSON.stringify(results));
    }

    // Apply user flags after cache retrieval so shared cache stays user-agnostic
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.enrichmentHelper.getSavedJobIds(userId),
      this.enrichmentHelper.getAppliedJobsMap(userId),
    ]);
    return this.enrichmentHelper.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getRecentJobs(limit: number = 20, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.enrichmentHelper.getSavedJobIds(userId),
      this.enrichmentHelper.getAppliedJobsMap(userId),
    ]);

    const results = await this.db.query.jobs.findMany({
      where: and(
        eq(jobs.isActive, true),
        eq(jobs.status, 'active'),
        or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
      ),
      with: {
        employer: { columns: employerPublicColumns },
        company: { columns: { id: true, name: true, logoUrl: true } },
        category: true,
      },
      orderBy: [desc(jobs.createdAt)],
      limit,
    });

    return this.enrichmentHelper.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getPopularJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.enrichmentHelper.getSavedJobIds(userId),
      this.enrichmentHelper.getAppliedJobsMap(userId),
    ]);
    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.status, 'active'),
      or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
    ];

    // Apply same filters as searchJobs with wildcard, skills, category and subcategory support
    if (dto.query) {
      const searchPattern = this.conditionBuilder.convertWildcardToSql(dto.query);
      conditions.push(this.conditionBuilder.buildSearchQueryCondition(dto.query, searchPattern));
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.workModes?.length) {
      conditions.push(
        sql`${jobs.workMode}::text[] && ARRAY[${sql.join(
          dto.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.jobType?.length) {
      conditions.push(
        sql`${jobs.jobType}::text[] && ARRAY[${sql.join(
          dto.jobType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(this.conditionBuilder.buildExperienceCondition(dto.experienceLevels));
    }

    if (dto.locationType?.length) {
      conditions.push(
        sql`${jobs.workMode}::text[] && ARRAY[${sql.join(
          dto.locationType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.payRate?.length) {
      conditions.push(
        sql`${jobs.payRate} IN (${sql.join(
          dto.payRate.map((r) => sql`${r}`),
          sql`, `,
        )})`,
      );
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

    // Industry filter — maps to job Category (parent category, parentId IS NULL)
    if (dto.industry?.length) {
      conditions.push(
        sql`${jobs.categoryId} IN (
          SELECT id FROM job_categories
          WHERE LOWER(name) IN (${sql.join(
            dto.industry.map((i) => sql`LOWER(${i})`),
            sql`, `,
          )})
          AND parent_id IS NULL
        )`,
      );
    }

    // Company type filter (supports multiple values)
    if (dto.companyType?.length) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND c.company_type IN (${sql.join(
            dto.companyType.map((t) => sql`${t}`),
            sql`, `,
          )})
        )`,
      );
    }

    // Department filter — maps to job Sub Category (child category, parentId IS NOT NULL)
    if (dto.department?.length) {
      conditions.push(
        sql`${jobs.subCategoryId} IN (
          SELECT id FROM job_categories
          WHERE LOWER(name) IN (${sql.join(
            dto.department.map((d) => sql`LOWER(${d})`),
            sql`, `,
          )})
          AND parent_id IS NOT NULL
        )`,
      );
    }

    // Salary range filter (supports multiple predefined ranges in "min-max" format)
    if (dto.salaryRange?.length) {
      const rangeConditions = dto.salaryRange
        .map((range) => {
          const parts = range.split(/[-_]/).map(Number);
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
          // Filter values are in LPA (lakhs); DB stores salary in rupees — multiply by 100000
          const minRupees = parts[0] * 100000;
          const maxRupees = parts[1] * 100000;
          return and(gte(jobs.salaryMax, minRupees), lte(jobs.salaryMin, maxRupees));
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
      if (rangeConditions.length) {
        conditions.push(or(...rangeConditions));
      }
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
        case '30d':
          daysAgo = 30;
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
        with: {
          employer: { columns: employerPublicColumns },
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
        },
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
      data: this.enrichmentHelper.mapUserFlags(jobsWithRelations, savedJobIds, appliedJobsMap),
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getTrendingJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.enrichmentHelper.getSavedJobIds(userId),
      this.enrichmentHelper.getAppliedJobsMap(userId),
    ]);

    // Time window for trending: last 7 days
    const trendingDays = 7;
    const trendingCutoff = new Date();
    trendingCutoff.setDate(trendingCutoff.getDate() - trendingDays);

    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.status, 'active'),
      or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
    ];

    // Filter for recent activity (jobs with activity in the trending window)
    // Use lastActivityAt if available, otherwise fall back to updatedAt
    conditions.push(
      sql`COALESCE(${jobs.lastActivityAt}, ${jobs.updatedAt}) >= ${trendingCutoff.toISOString()}`,
    );

    // Apply same filters as searchJobs with wildcard, skills, category and subcategory support
    if (dto.query) {
      const searchPattern = this.conditionBuilder.convertWildcardToSql(dto.query);
      conditions.push(this.conditionBuilder.buildSearchQueryCondition(dto.query, searchPattern));
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.workModes?.length) {
      conditions.push(
        sql`${jobs.workMode}::text[] && ARRAY[${sql.join(
          dto.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.jobType?.length) {
      conditions.push(
        sql`${jobs.jobType}::text[] && ARRAY[${sql.join(
          dto.jobType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(this.conditionBuilder.buildExperienceCondition(dto.experienceLevels));
    }

    if (dto.locationType?.length) {
      conditions.push(
        sql`${jobs.workMode}::text[] && ARRAY[${sql.join(
          dto.locationType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.payRate?.length) {
      conditions.push(
        sql`${jobs.payRate} IN (${sql.join(
          dto.payRate.map((r) => sql`${r}`),
          sql`, `,
        )})`,
      );
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

    // Industry filter — maps to job Category (parent category, parentId IS NULL)
    if (dto.industry?.length) {
      conditions.push(
        sql`${jobs.categoryId} IN (
          SELECT id FROM job_categories
          WHERE LOWER(name) IN (${sql.join(
            dto.industry.map((i) => sql`LOWER(${i})`),
            sql`, `,
          )})
          AND parent_id IS NULL
        )`,
      );
    }

    // Company type filter (supports multiple values)
    if (dto.companyType?.length) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${employers} e
          JOIN ${companies} c ON e.company_id = c.id
          WHERE e.id = ${jobs.employerId}
          AND c.company_type IN (${sql.join(
            dto.companyType.map((t) => sql`${t}`),
            sql`, `,
          )})
        )`,
      );
    }

    // Department filter — maps to job Sub Category (child category, parentId IS NOT NULL)
    if (dto.department?.length) {
      conditions.push(
        sql`${jobs.subCategoryId} IN (
          SELECT id FROM job_categories
          WHERE LOWER(name) IN (${sql.join(
            dto.department.map((d) => sql`LOWER(${d})`),
            sql`, `,
          )})
          AND parent_id IS NOT NULL
        )`,
      );
    }

    // Salary range filter (supports multiple predefined ranges in "min-max" format)
    if (dto.salaryRange?.length) {
      const rangeConditions = dto.salaryRange
        .map((range) => {
          const parts = range.split(/[-_]/).map(Number);
          if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
          // Filter values are in LPA (lakhs); DB stores salary in rupees — multiply by 100000
          const minRupees = parts[0] * 100000;
          const maxRupees = parts[1] * 100000;
          return and(gte(jobs.salaryMax, minRupees), lte(jobs.salaryMin, maxRupees));
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
      if (rangeConditions.length) {
        conditions.push(or(...rangeConditions));
      }
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
        case '30d':
          daysAgo = 30;
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
        with: {
          employer: { columns: employerPublicColumns },
          company: { columns: { id: true, name: true, logoUrl: true } },
          category: true,
        },
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
      data: this.enrichmentHelper.mapUserFlags(jobsWithRelations, savedJobIds, appliedJobsMap),
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }
}
