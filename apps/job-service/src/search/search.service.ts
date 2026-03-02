import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, ilike, desc, asc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import {
  Database,
  jobs,
  employers,
  companies,
  savedJobs,
  jobApplications,
  filterOptions,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SearchJobsDto } from './dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Converts user wildcard pattern to SQL LIKE pattern
   * Supports: "A*" -> "A%", "*developer" -> "%developer", "full stack" -> "%full stack%"
   */
  private convertWildcardToSql(pattern: string): string {
    // Replace * with % for SQL LIKE
    let sqlPattern = pattern.replace(/\*/g, '%');

    // If no wildcards present, wrap with % for partial matching
    if (!pattern.includes('*')) {
      sqlPattern = `%${sqlPattern}%`;
    }

    return sqlPattern;
  }

  private async getSavedJobIds(userId?: string): Promise<Set<string>> {
    if (!userId) return new Set();

    const savedJobsList = await this.db
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(eq(savedJobs.jobSeekerId, userId));

    return new Set(savedJobsList.map((s) => s.jobId));
  }

  private async getAppliedJobsMap(userId?: string): Promise<Map<string, Date>> {
    if (!userId) return new Map();

    const appliedList = await this.db
      .select({ jobId: jobApplications.jobId, appliedAt: jobApplications.appliedAt })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));

    return new Map(appliedList.map((a) => [a.jobId, a.appliedAt]));
  }

  private mapUserFlags<T extends { id: string }>(
    jobsList: T[],
    savedJobIds: Set<string>,
    appliedJobsMap: Map<string, Date>,
  ): (T & { isSaved: boolean; isApplied: boolean; isAppliedAt: Date | null })[] {
    return jobsList.map((job) => ({
      ...job,
      isSaved: savedJobIds.has(job.id),
      isApplied: appliedJobsMap.has(job.id),
      isAppliedAt: appliedJobsMap.get(job.id) || null,
    }));
  }

  async searchJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);
    const conditions: any[] = [eq(jobs.isActive, true)];
    const useRelevanceSort = dto.sortBy === 'relevance' && dto.query;

    // Text search with wildcard support - case insensitive
    if (dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);

      // Search in title, description, and skills array
      conditions.push(
        or(
          ilike(jobs.title, searchPattern),
          ilike(jobs.description, searchPattern),
          // Skills array search - check if any skill matches the pattern
          sql`EXISTS (
            SELECT 1 FROM unnest(${jobs.skills}) AS skill
            WHERE skill ILIKE ${searchPattern}
          )`,
        ),
      );
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
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

    if (dto.jobType?.length) {
      conditions.push(
        sql`${jobs.jobType} && ARRAY[${sql.join(
          dto.jobType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(or(...dto.experienceLevels.map((l) => eq(jobs.experienceLevel, l as any))));
    }

    if (dto.locationType) {
      conditions.push(sql`${jobs.workMode} && ARRAY[${sql`${dto.locationType}`}]::text[]`);
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.payRate) {
      conditions.push(eq(jobs.payRate, dto.payRate));
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

    // For relevance sorting, we need a custom query with scoring
    if (useRelevanceSort && dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);

      // Relevance scoring:
      // - Title exact match: 100 points
      // - Title starts with: 80 points
      // - Title contains: 50 points
      // - Skills match: 30 points
      // - Description match: 10 points
      const relevanceScore = sql`
        CASE
          WHEN LOWER(${jobs.title}) = LOWER(${dto.query}) THEN 100
          WHEN LOWER(${jobs.title}) LIKE LOWER(${dto.query + '%'}) THEN 80
          WHEN LOWER(${jobs.title}) LIKE LOWER(${'%' + dto.query + '%'}) THEN 50
          ELSE 0
        END +
        CASE
          WHEN EXISTS (
            SELECT 1 FROM unnest(${jobs.skills}) AS skill
            WHERE skill ILIKE ${searchPattern}
          ) THEN 30
          ELSE 0
        END +
        CASE
          WHEN ${jobs.description} ILIKE ${searchPattern} THEN 10
          ELSE 0
        END
      `;

      const results = await this.db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .orderBy(sql`${relevanceScore} DESC`, desc(jobs.createdAt))
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
            employer: true,
            company: { columns: { id: true, name: true, logoUrl: true } },
            category: true,
          },
        });

        // Maintain relevance order from original query
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
        data: this.mapUserFlags(jobsWithRelations, savedJobIds, appliedJobsMap),
        pagination: {
          totalJob: total,
          pageCount: totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
        },
      };
    }

    // Determine sort order for non-relevance sorting
    let orderBy: any;
    switch (dto.sortBy) {
      case 'salary':
      case 'salary_desc':
        orderBy = desc(jobs.salaryMax);
        break;
      case 'salary_asc':
        orderBy = asc(jobs.salaryMin);
        break;
      case 'date':
      default:
        orderBy = desc(jobs.createdAt);
    }

    const results = await this.db.query.jobs.findMany({
      where: and(...conditions),
      with: {
        employer: true,
        company: {
          columns: { id: true, name: true, logoUrl: true },
        },
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
      data: this.mapUserFlags(results, savedJobIds, appliedJobsMap),
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getSimilarJobs(jobId: string, limit: number = 5, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);

    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    if (!job) return [];

    // Find jobs in same category or with similar title
    const results = await this.db.query.jobs.findMany({
      where: and(
        eq(jobs.isActive, true),
        or(eq(jobs.categoryId, job.categoryId!), ilike(jobs.title, `%${job.title.split(' ')[0]}%`)),
        sql`${jobs.id} != ${jobId}`,
      ),
      with: { employer: true, company: { columns: { id: true, name: true, logoUrl: true } } },
      limit,
    });

    return this.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getFeaturedJobs(limit: number = 10, userId?: string) {
    const cacheKey = 'jobs:featured';
    const cached = await this.redis.get(cacheKey);

    let results: any[];
    if (cached) {
      results = JSON.parse(cached);
    } else {
      results = await this.db.query.jobs.findMany({
        where: and(eq(jobs.isActive, true), eq(jobs.isFeatured, true)),
        with: {
          employer: true,
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
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);
    return this.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getRecentJobs(limit: number = 20, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);

    const results = await this.db.query.jobs.findMany({
      where: eq(jobs.isActive, true),
      with: {
        employer: true,
        company: { columns: { id: true, name: true, logoUrl: true } },
        category: true,
      },
      orderBy: [desc(jobs.createdAt)],
      limit,
    });

    return this.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getPopularJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);
    const conditions: any[] = [eq(jobs.isActive, true)];

    // Apply same filters as searchJobs with wildcard and skills support
    if (dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);
      conditions.push(
        or(
          ilike(jobs.title, searchPattern),
          ilike(jobs.description, searchPattern),
          sql`EXISTS (
            SELECT 1 FROM unnest(${jobs.skills}) AS skill
            WHERE skill ILIKE ${searchPattern}
          )`,
        ),
      );
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.workModes?.length) {
      conditions.push(
        sql`${jobs.workMode} && ARRAY[${sql.join(
          dto.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.jobType?.length) {
      conditions.push(
        sql`${jobs.jobType} && ARRAY[${sql.join(
          dto.jobType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(or(...dto.experienceLevels.map((l) => eq(jobs.experienceLevel, l as any))));
    }

    if (dto.locationType) {
      conditions.push(sql`${jobs.workMode} && ARRAY[${sql`${dto.locationType}`}]::text[]`);
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.payRate) {
      conditions.push(eq(jobs.payRate, dto.payRate));
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
          employer: true,
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
      data: this.mapUserFlags(jobsWithRelations, savedJobIds, appliedJobsMap),
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
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);

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

    // Apply same filters as searchJobs with wildcard and skills support
    if (dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);
      conditions.push(
        or(
          ilike(jobs.title, searchPattern),
          ilike(jobs.description, searchPattern),
          sql`EXISTS (
            SELECT 1 FROM unnest(${jobs.skills}) AS skill
            WHERE skill ILIKE ${searchPattern}
          )`,
        ),
      );
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.workModes?.length) {
      conditions.push(
        sql`${jobs.workMode} && ARRAY[${sql.join(
          dto.workModes.map((m) => sql`${m}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.jobType?.length) {
      conditions.push(
        sql`${jobs.jobType} && ARRAY[${sql.join(
          dto.jobType.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    if (dto.experienceLevels?.length) {
      conditions.push(or(...dto.experienceLevels.map((l) => eq(jobs.experienceLevel, l as any))));
    }

    if (dto.locationType) {
      conditions.push(sql`${jobs.workMode} && ARRAY[${sql`${dto.locationType}`}]::text[]`);
    }

    if (dto.salaryMin) {
      conditions.push(gte(jobs.salaryMax, dto.salaryMin));
    }

    if (dto.salaryMax) {
      conditions.push(lte(jobs.salaryMin, dto.salaryMax));
    }

    if (dto.payRate) {
      conditions.push(eq(jobs.payRate, dto.payRate));
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
          employer: true,
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
      data: this.mapUserFlags(jobsWithRelations, savedJobIds, appliedJobsMap),
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getFilterOptions() {
    const cacheKey = 'search:filter-options';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const rows = await this.db
      .select({
        group: filterOptions.group,
        label: filterOptions.label,
        value: filterOptions.value,
      })
      .from(filterOptions)
      .where(eq(filterOptions.isActive, true))
      .orderBy(asc(filterOptions.group), asc(filterOptions.displayOrder));

    // Group by filter group and convert group keys to camelCase
    const groupKeyMap: Record<string, string> = {
      experience_level: 'experienceLevel',
      location_type: 'locationType',
      pay_rate: 'payRate',
      posted_within: 'postedWithin',
      job_type: 'jobType',
      industry: 'industry',
      department: 'department',
      company_type: 'companyType',
      sort_by: 'sortBy',
    };

    const grouped: Record<string, { label: string; value: string }[]> = {};

    for (const row of rows) {
      const key = groupKeyMap[row.group] || row.group;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({ label: row.label, value: row.value });
    }

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(grouped));

    return grouped;
  }
}
