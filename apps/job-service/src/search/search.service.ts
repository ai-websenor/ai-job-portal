import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, ilike, desc, asc, sql, isNull, isNotNull } from 'drizzle-orm';
import Redis from 'ioredis';
import {
  Database,
  jobs,
  employers,
  companies,
  savedJobs,
  jobApplications,
  filterOptions,
  jobCategories,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SearchJobsDto } from './dto';

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

  /**
   * Builds a SQL condition for experience level filters.
   * Handles numeric values ("2" → falls in [experienceMin, experienceMax])
   * and plus-suffixed values ("5+" → experienceMax >= 5).
   * Falls back to text match on experienceLevel for non-numeric values.
   */
  private buildExperienceCondition(experienceLevels: string[]) {
    const expConditions = experienceLevels.map((level) => {
      const isPlus = level.endsWith('+');
      const years = parseInt(isPlus ? level.slice(0, -1) : level, 10);

      if (isNaN(years)) {
        return eq(jobs.experienceLevel, level as any);
      }

      if (isPlus) {
        // "5+" → job accepts candidates with 5+ years
        return sql`(${jobs.experienceMax} >= ${years} OR ${jobs.experienceMax} IS NULL)`;
      }

      // "2" → job range should include 2 years
      return sql`(${jobs.experienceMin} IS NULL OR ${jobs.experienceMin} <= ${years}) AND (${jobs.experienceMax} IS NULL OR ${jobs.experienceMax} >= ${years})`;
    });

    return or(...expConditions);
  }

  /**
   * Builds robust query search conditions.
   * Matches full phrase and individual words against:
   * Title, Description, Skills, Categories, and Subcategories.
   * Prioritizes matches in the Job Title.
   */
  private buildSearchQueryCondition(query: string, searchPattern: string) {
    const queryWords = query
      .replace(/\*/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 1);

    const exactPhraseCondition = or(
      ilike(jobs.title, searchPattern),
      ilike(jobs.description, searchPattern),
      sql`EXISTS (
        SELECT 1 FROM unnest(${jobs.skills}) AS skill
        WHERE skill ILIKE ${searchPattern}
      )`,
      sql`EXISTS (
        SELECT 1 FROM job_categories
        WHERE job_categories.id = ${jobs.categoryId}
        AND job_categories.name ILIKE ${searchPattern}
      )`,
      sql`EXISTS (
        SELECT 1 FROM job_categories
        WHERE job_categories.id = ${jobs.subCategoryId}
        AND job_categories.name ILIKE ${searchPattern}
      )`,
    );

    const allWordsMatchCondition =
      queryWords.length > 0
        ? and(
            ...queryWords.map((w) =>
              or(
                ilike(jobs.title, `%${w}%`),
                ilike(jobs.description, `%${w}%`),
                sql`EXISTS (
                SELECT 1 FROM unnest(${jobs.skills}) AS skill
                WHERE skill ILIKE ${'%' + w + '%'}
              )`,
                sql`EXISTS (
                SELECT 1 FROM job_categories
                WHERE job_categories.id = ${jobs.categoryId}
                AND job_categories.name ILIKE ${'%' + w + '%'}
              )`,
                sql`EXISTS (
                SELECT 1 FROM job_categories
                WHERE job_categories.id = ${jobs.subCategoryId}
                AND job_categories.name ILIKE ${'%' + w + '%'}
              )`,
              ),
            ),
          )
        : sql`true`;

    const anyWordInTitleCondition =
      queryWords.length > 0
        ? or(...queryWords.map((w) => ilike(jobs.title, `%${w}%`)))
        : sql`false`;

    return or(exactPhraseCondition, allWordsMatchCondition, anyWordInTitleCondition);
  }

  private async getSavedJobIds(userId?: string): Promise<Set<string>> {
    if (!userId) return new Set();

    const savedJobsList = await this.db
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(eq(savedJobs.jobSeekerId, userId));

    return new Set(savedJobsList.map((s) => s.jobId));
  }

  private static readonly REAPPLY_COOLDOWN_DAYS = 60;

  private async getAppliedJobsMap(
    userId?: string,
  ): Promise<Map<string, { appliedAt: Date; status: string; updatedAt: Date }>> {
    if (!userId) return new Map();

    const appliedList = await this.db
      .select({
        jobId: jobApplications.jobId,
        appliedAt: jobApplications.appliedAt,
        status: jobApplications.status,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));

    return new Map(appliedList.map((a) => [a.jobId, a]));
  }

  private mapUserFlags<T extends { id: string }>(
    jobsList: T[],
    savedJobIds: Set<string>,
    appliedJobsMap: Map<string, { appliedAt: Date; status: string; updatedAt: Date }>,
  ) {
    const now = new Date();
    return jobsList.map((job) => {
      const appInfo = appliedJobsMap.get(job.id);
      const isWithdrawn = appInfo?.status === 'withdrawn';

      let reapplyDaysLeft: number | null = null;
      if (isWithdrawn && appInfo) {
        const withdrawnAt = new Date(appInfo.updatedAt);
        const reapplyDate = new Date(withdrawnAt);
        reapplyDate.setDate(reapplyDate.getDate() + SearchService.REAPPLY_COOLDOWN_DAYS);
        const daysLeft = Math.ceil((reapplyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
      }

      return {
        ...job,
        isSaved: savedJobIds.has(job.id),
        isApplied: appInfo ? !isWithdrawn : false,
        isAppliedAt: appInfo?.appliedAt || null,
        isWithdrawn,
        reapplyDaysLeft,
      };
    });
  }

  async searchJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);
    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.status, 'active'),
      or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
    ];
    const useRelevanceSort = dto.sortBy === 'relevance' && dto.query;

    // Text search with wildcard support - case insensitive and robust matching
    if (dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);
      conditions.push(this.buildSearchQueryCondition(dto.query, searchPattern));
    }

    if (dto.categoryId) {
      conditions.push(eq(jobs.categoryId, dto.categoryId));
    }

    if (dto.workModes?.length) {
      // Use PostgreSQL array overlap operator to check if job's workMode array overlaps with searched modes
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
      conditions.push(this.buildExperienceCondition(dto.experienceLevels));
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

    // For relevance sorting, we need a custom query with scoring
    if (useRelevanceSort && dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);

      // Robust Relevance scoring:
      // - Title exact match: 200 points
      // - Title starts with: 150 points
      // - Title contains: 100 points
      // - Title contains individual words: +40 points per word
      // - Skills match full query: 50 points
      // - Skills match individual words: +20 points per word
      // - Description match full query: 30 points
      // - Description match individual words: +10 points per word
      // - Featured job boost: 20 points
      const queryWords = dto.query
        .replace(/\*/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 1);

      const titleWordScores = queryWords.map(
        (w) => sql`CASE WHEN LOWER(${jobs.title}) LIKE LOWER(${'%' + w + '%'}) THEN 40 ELSE 0 END`,
      );
      const skillWordScores = queryWords.map(
        (w) => sql`CASE WHEN EXISTS (
          SELECT 1 FROM unnest(${jobs.skills}) AS skill
          WHERE skill ILIKE ${'%' + w + '%'}
        ) THEN 20 ELSE 0 END`,
      );
      const descWordScores = queryWords.map(
        (w) => sql`CASE WHEN ${jobs.description} ILIKE ${'%' + w + '%'} THEN 10 ELSE 0 END`,
      );

      const relevanceScore = sql`
        (
          CASE
            WHEN LOWER(${jobs.title}) = LOWER(${dto.query}) THEN 200
            WHEN LOWER(${jobs.title}) LIKE LOWER(${dto.query + '%'}) THEN 150
            WHEN LOWER(${jobs.title}) LIKE LOWER(${'%' + dto.query + '%'}) THEN 100
            ELSE 0
          END +
          CASE
            WHEN EXISTS (
              SELECT 1 FROM unnest(${jobs.skills}) AS skill
              WHERE skill ILIKE ${searchPattern}
            ) THEN 50
            ELSE 0
          END +
          CASE
            WHEN ${jobs.isFeatured} = true THEN 20
            ELSE 0
          END +
          CASE
            WHEN ${jobs.description} ILIKE ${searchPattern} THEN 30
            ELSE 0
          END
          ${titleWordScores.length > 0 ? sql` + ${sql.join(titleWordScores, sql` + `)}` : sql``}
          ${skillWordScores.length > 0 ? sql` + ${sql.join(skillWordScores, sql` + `)}` : sql``}
          ${descWordScores.length > 0 ? sql` + ${sql.join(descWordScores, sql` + `)}` : sql``}
        )
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
            employer: { columns: employerPublicColumns },
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
        employer: { columns: employerPublicColumns },
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

    return this.mapUserFlags(results, savedJobIds, appliedJobsMap);
  }

  async getPopularJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.getSavedJobIds(userId),
      this.getAppliedJobsMap(userId),
    ]);
    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.status, 'active'),
      or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
    ];

    // Apply same filters as searchJobs with wildcard, skills, category and subcategory support
    if (dto.query) {
      const searchPattern = this.convertWildcardToSql(dto.query);
      conditions.push(this.buildSearchQueryCondition(dto.query, searchPattern));
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
      conditions.push(this.buildExperienceCondition(dto.experienceLevels));
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
      const searchPattern = this.convertWildcardToSql(dto.query);
      conditions.push(this.buildSearchQueryCondition(dto.query, searchPattern));
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
      conditions.push(this.buildExperienceCondition(dto.experienceLevels));
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

    // Fetch all active filter options including admin-curated industry/department
    const rows = await this.db
      .select({
        group: filterOptions.group,
        label: filterOptions.label,
        value: filterOptions.value,
      })
      .from(filterOptions)
      .where(eq(filterOptions.isActive, true))
      .orderBy(asc(filterOptions.group), asc(filterOptions.displayOrder));

    const groupKeyMap: Record<string, string> = {
      experience_level: 'experienceLevel',
      location_type: 'locationType',
      pay_rate: 'payRate',
      posted_within: 'postedWithin',
      job_type: 'jobType',
      company_type: 'companyType',
      salary_range: 'salaryRange',
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

    // Industry: top 6 parent categories ranked by job count
    const topCategories = await this.db
      .select({
        name: jobCategories.name,
        jobCount: sql<number>`count(${jobs.id})`,
      })
      .from(jobCategories)
      .leftJoin(jobs, eq(jobs.categoryId, jobCategories.id))
      .where(isNull(jobCategories.parentId))
      .groupBy(jobCategories.id)
      .orderBy(sql`count(${jobs.id}) DESC`)
      .limit(6);

    grouped['industry'] = topCategories.map((c) => ({ label: c.name, value: c.name }));

    // Department: top 6 subcategories ranked by job count
    const topSubCategories = await this.db
      .select({
        name: jobCategories.name,
        jobCount: sql<number>`count(${jobs.id})`,
      })
      .from(jobCategories)
      .leftJoin(jobs, eq(jobs.subCategoryId, jobCategories.id))
      .where(isNotNull(jobCategories.parentId))
      .groupBy(jobCategories.id)
      .orderBy(sql`count(${jobs.id}) DESC`)
      .limit(6);

    grouped['department'] = topSubCategories.map((c) => ({ label: c.name, value: c.name }));

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(grouped));

    return grouped;
  }
}
