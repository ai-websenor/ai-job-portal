import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, gte, lte, ilike, desc, asc, sql, isNull, isNotNull } from 'drizzle-orm';
import Redis from 'ioredis';
import {
  Database,
  jobs,
  employers,
  companies,
  filterOptions,
  jobCategories,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SearchJobsDto } from './dto';
import { SearchConditionBuilder } from './search-condition.builder';
import { SearchEnrichmentHelper } from './search-enrichment.helper';
import { JobDiscoveryService } from './job-discovery.service';

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
    private readonly conditionBuilder: SearchConditionBuilder,
    private readonly enrichmentHelper: SearchEnrichmentHelper,
    private readonly discoveryService: JobDiscoveryService,
  ) {}

  async searchJobs(dto: SearchJobsDto, userId?: string) {
    const [savedJobIds, appliedJobsMap] = await Promise.all([
      this.enrichmentHelper.getSavedJobIds(userId),
      this.enrichmentHelper.getAppliedJobsMap(userId),
    ]);
    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.status, 'active'),
      or(sql`${jobs.deadline} IS NULL`, sql`${jobs.deadline} > NOW()`),
    ];
    const useRelevanceSort = dto.sortBy === 'relevance' && dto.query;

    // Text search with wildcard support - case insensitive and robust matching
    if (dto.query) {
      const searchPattern = this.conditionBuilder.convertWildcardToSql(dto.query);
      conditions.push(this.conditionBuilder.buildSearchQueryCondition(dto.query, searchPattern));
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

    // For relevance sorting, we need a custom query with scoring
    if (useRelevanceSort && dto.query) {
      const searchPattern = this.conditionBuilder.convertWildcardToSql(dto.query);

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
        data: this.enrichmentHelper.mapUserFlags(jobsWithRelations, savedJobIds, appliedJobsMap),
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
      data: this.enrichmentHelper.mapUserFlags(results, savedJobIds, appliedJobsMap),
      pagination: {
        totalJob: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getSimilarJobs(jobId: string, limit: number = 5, userId?: string) {
    return this.discoveryService.getSimilarJobs(jobId, limit, userId);
  }

  async getFeaturedJobs(limit: number = 10, userId?: string) {
    return this.discoveryService.getFeaturedJobs(limit, userId);
  }

  async getRecentJobs(limit: number = 20, userId?: string) {
    return this.discoveryService.getRecentJobs(limit, userId);
  }

  async getPopularJobs(dto: SearchJobsDto, userId?: string) {
    return this.discoveryService.getPopularJobs(dto, userId);
  }

  async getTrendingJobs(dto: SearchJobsDto, userId?: string) {
    return this.discoveryService.getTrendingJobs(dto, userId);
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
