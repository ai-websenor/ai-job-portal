import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, ilike, notInArray, inArray } from 'drizzle-orm';
import {
  Database,
  jobs,
  jobViews,
  savedJobs,
  profiles,
  jobPreferences,
  jobApplications,
  savedSearches,
  companies,
} from '@ai-job-portal/database';
import { SearchJobsDto } from '../search/dto';
import { DATABASE_CLIENT } from '../database/database.module';
import { employerPublicColumns } from './job-columns.const';

@Injectable()
export class SavedJobService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async recordView(jobId: string, userId?: string, ip?: string) {
    // Validate UUID format to prevent errors from routing mismatches
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return; // Silently skip if not a valid UUID
    }

    if (userId) {
      await this.db.insert(jobViews).values({
        jobId,
        userId,
        ipAddress: ip,
      });
    }

    await this.db
      .update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));
  }

  async saveJob(userId: string, jobId: string) {
    const existing = await this.db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, jobId)),
    });
    if (existing) return { message: 'Already saved' };

    await this.db.insert(savedJobs).values({ jobSeekerId: userId, jobId });
    return { message: 'Job saved' };
  }

  async unsaveJob(userId: string, jobId: string) {
    await this.db
      .delete(savedJobs)
      .where(and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, jobId)));
    return { message: 'Job unsaved' };
  }

  async getSavedJobs(userId: string, search?: string, fromDate?: string, toDate?: string) {
    // Resolve job IDs when search provided (matches job title OR company name)
    let filteredJobIds: string[] | null = null;

    if (search) {
      const term = `%${search}%`;

      // Jobs matching by title
      const jobsByTitle = await this.db.query.jobs.findMany({
        where: ilike(jobs.title, term),
        columns: { id: true },
      });

      // Jobs matching by company name
      const matchingCompanies = await this.db.query.companies.findMany({
        where: ilike(companies.name, term),
        columns: { id: true },
      });
      const companyIds = matchingCompanies.map((c) => c.id);
      const jobsByCompany =
        companyIds.length > 0
          ? await this.db.query.jobs.findMany({
              where: inArray(jobs.companyId, companyIds),
              columns: { id: true },
            })
          : [];

      filteredJobIds = [
        ...new Set([...jobsByTitle.map((j) => j.id), ...jobsByCompany.map((j) => j.id)]),
      ];
      if (filteredJobIds.length === 0) return [];
    }

    // Build where conditions — user ownership + optional search + optional saved-date range
    const savedJobsConditions: any[] = [eq(savedJobs.jobSeekerId, userId)];
    if (filteredJobIds) {
      savedJobsConditions.push(inArray(savedJobs.jobId, filteredJobIds));
    }
    // Saved-date range filter (inclusive) — filters on when the job was saved (createdAt)
    if (fromDate) {
      savedJobsConditions.push(gte(savedJobs.createdAt, new Date(fromDate)));
    }
    if (toDate) {
      savedJobsConditions.push(lte(savedJobs.createdAt, new Date(toDate)));
    }

    const savedJobsWhere =
      savedJobsConditions.length === 1 ? savedJobsConditions[0] : and(...savedJobsConditions);

    const savedJobRecords = await this.db.query.savedJobs.findMany({
      where: savedJobsWhere,
      with: {
        job: {
          with: {
            employer: { columns: employerPublicColumns },
            company: {
              columns: { id: true, name: true, logoUrl: true },
            },
            category: true,
          },
        },
      },
    });

    // Get applied jobs map for this user
    const appliedList = await this.db
      .select({
        jobId: jobApplications.jobId,
        appliedAt: jobApplications.appliedAt,
        status: jobApplications.status,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));
    const appliedJobsMap = new Map(appliedList.map((a) => [a.jobId, a]));

    // Return flat job objects with company, isSaved, isApplied, isAppliedAt
    const now = new Date();
    return savedJobRecords.map((record) => {
      const appInfo = appliedJobsMap.get(record.job.id);
      const isWithdrawn = appInfo?.status === 'withdrawn';

      let reapplyDaysLeft: number | null = null;
      if (isWithdrawn && appInfo) {
        const withdrawnAt = new Date(appInfo.updatedAt);
        const reapplyDate = new Date(withdrawnAt);
        reapplyDate.setDate(reapplyDate.getDate() + 60);
        const daysLeft = Math.ceil((reapplyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
      }

      return {
        ...record.job,
        isSaved: true,
        isApplied: appInfo ? !isWithdrawn : false,
        isAppliedAt: appInfo?.appliedAt || null,
        isWithdrawn,
        reapplyDaysLeft,
      };
    });
  }

  async getRecommendedJobs(userId: string, dto: SearchJobsDto) {
    // Fetch candidate profile
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });

    // Fetch job preferences if profile exists
    let preferences: any = null;
    if (profile) {
      preferences = await this.db.query.jobPreferences.findFirst({
        where: eq(jobPreferences.profileId, profile.id),
      });
    }

    // Fetch applied job IDs to exclude
    const appliedJobs = await this.db
      .select({
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        updatedAt: jobApplications.updatedAt,
      })
      .from(jobApplications)
      .where(eq(jobApplications.jobSeekerId, userId));
    const appliedJobIds = appliedJobs.map((a) => a.jobId);
    const appliedJobsMap = new Map(appliedJobs.map((a) => [a.jobId, a]));

    // Fetch saved job IDs for boosting
    const savedJobsList = await this.db
      .select({ jobId: savedJobs.jobId })
      .from(savedJobs)
      .where(eq(savedJobs.jobSeekerId, userId));
    const savedJobIds = savedJobsList.map((s) => s.jobId);

    // Fetch saved searches for keyword matching
    const userSavedSearches = await this.db.query.savedSearches.findMany({
      where: and(eq(savedSearches.userId, userId), eq(savedSearches.isActive, true)),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
      limit: 10, // Limit to recent saved searches
    });

    // Extract keywords from saved searches
    const savedSearchKeywords: string[] = [];
    for (const search of userSavedSearches) {
      try {
        const criteria = JSON.parse(search.searchCriteria || '{}');
        if (criteria.query) {
          savedSearchKeywords.push(criteria.query.toLowerCase());
        }
        if (criteria.keywords) {
          const keywords = Array.isArray(criteria.keywords)
            ? criteria.keywords
            : criteria.keywords.split(',');
          savedSearchKeywords.push(...keywords.map((k: string) => k.trim().toLowerCase()));
        }
        if (criteria.title) {
          savedSearchKeywords.push(criteria.title.toLowerCase());
        }
      } catch {
        // Skip invalid JSON
      }
    }
    // Remove duplicates
    const uniqueKeywords = [...new Set(savedSearchKeywords)].filter((k) => k.length > 2);

    // Build base conditions
    const conditions: any[] = [eq(jobs.isActive, true)];

    // Exclude expired jobs
    conditions.push(or(sql`${jobs.deadline} IS NULL`, gte(jobs.deadline, new Date())));

    // Exclude already applied jobs
    if (appliedJobIds.length > 0) {
      conditions.push(notInArray(jobs.id, appliedJobIds));
    }

    // Apply optional filters from query params (same as searchJobs)
    if (dto.query) {
      conditions.push(
        or(ilike(jobs.title, `%${dto.query}%`), ilike(jobs.description, `%${dto.query}%`)),
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

    // Build recommendation scoring using SQL CASE statements
    // Score components:
    // - Job preference match (location, employment type): 40 points
    // - Saved job similarity (same category): 25 points
    // - Engagement boost (application_count, view_count): 20 points
    // - Recency boost: 15 points

    // Parse preferences for location and job type matching
    const preferredLocations = preferences?.preferredLocations
      ? preferences.preferredLocations.split(',').map((l: string) => l.trim().toLowerCase())
      : [];
    const preferredJobTypes = preferences?.jobTypes
      ? preferences.jobTypes.split(',').map((t: string) => t.trim().toLowerCase())
      : [];

    // Get categories from saved jobs for similarity matching
    let savedJobCategories: string[] = [];
    if (savedJobIds.length > 0) {
      const savedJobsData = await this.db
        .select({ categoryId: jobs.categoryId })
        .from(jobs)
        .where(
          sql`${jobs.id} IN (${sql.join(
            savedJobIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );
      savedJobCategories = savedJobsData
        .filter((j) => j.categoryId)
        .map((j) => j.categoryId as string);
    }

    // Build location preference SQL condition
    const locationScoreSql =
      preferredLocations.length > 0
        ? sql`CASE WHEN ${or(
            ...preferredLocations.map((loc: string) =>
              or(
                sql`LOWER(${jobs.city}) LIKE ${`%${loc}%`}`,
                sql`LOWER(${jobs.state}) LIKE ${`%${loc}%`}`,
                sql`LOWER(${jobs.country}) LIKE ${`%${loc}%`}`,
              ),
            ),
          )} THEN 20 ELSE 0 END`
        : sql`0`;

    // Build job type preference SQL condition
    // Check if any preferred job type overlaps with the job's jobType array
    const jobTypeScoreSql =
      preferredJobTypes.length > 0
        ? sql`CASE WHEN ${jobs.jobType} && ARRAY[${sql.join(
            preferredJobTypes.map((t: string) => sql`${t}`),
            sql`, `,
          )}] THEN 20 ELSE 0 END`
        : sql`0`;

    // Build category similarity SQL condition (from saved jobs)
    const categoryScoreSql =
      savedJobCategories.length > 0
        ? sql`CASE WHEN ${jobs.categoryId} IN (${sql.join(
            savedJobCategories.map((c) => sql`${c}`),
            sql`, `,
          )}) THEN 25 ELSE 0 END`
        : sql`0`;

    // Build saved search keyword matching SQL condition
    const keywordScoreSql =
      uniqueKeywords.length > 0
        ? sql`CASE WHEN ${or(
            ...uniqueKeywords.map((keyword: string) =>
              or(
                sql`LOWER(${jobs.title}) LIKE ${`%${keyword}%`}`,
                sql`LOWER(${jobs.description}) LIKE ${`%${keyword}%`}`,
                sql`${keyword} = ANY(SELECT LOWER(unnest(${jobs.skills})))`,
              ),
            ),
          )} THEN 15 ELSE 0 END`
        : sql`0`;

    // Build saved job boost (jobs the user saved get a small boost)
    const savedBoostSql =
      savedJobIds.length > 0
        ? sql`CASE WHEN ${jobs.id} IN (${sql.join(
            savedJobIds.map((id) => sql`${id}`),
            sql`, `,
          )}) THEN 10 ELSE 0 END`
        : sql`0`;

    // Engagement score (normalized)
    const engagementScoreSql = sql`(
      LEAST(COALESCE(${jobs.applicationCount}, 0), 100) * 0.15 +
      LEAST(COALESCE(${jobs.viewCount}, 0) / 10, 50) * 0.05
    )`;

    // Recency score (jobs posted in last 7 days get boost)
    const recencyScoreSql = sql`CASE
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '7 days' THEN 15
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '14 days' THEN 10
      WHEN ${jobs.createdAt} >= NOW() - INTERVAL '30 days' THEN 5
      ELSE 0
    END`;

    // Combined recommendation score
    const recommendationScoreSql = sql`(
      ${locationScoreSql} +
      ${jobTypeScoreSql} +
      ${categoryScoreSql} +
      ${keywordScoreSql} +
      ${savedBoostSql} +
      ${engagementScoreSql} +
      ${recencyScoreSql}
    )`;

    // Get recommended jobs ordered by score
    const results = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(sql`${recommendationScoreSql} DESC`, desc(jobs.createdAt))
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

      // Maintain recommendation order from original query
      const jobMap = new Map(jobsWithRelations.map((j) => [j.id, j]));
      jobsWithRelations = jobIds.map((id) => jobMap.get(id)).filter(Boolean);

      // Add isSaved, isApplied, isWithdrawn, reapplyDaysLeft flags
      const now = new Date();
      jobsWithRelations = jobsWithRelations.map((job) => {
        const appInfo = appliedJobsMap.get(job.id);
        const isWithdrawn = appInfo?.status === 'withdrawn';

        let reapplyDaysLeft: number | null = null;
        if (isWithdrawn && appInfo) {
          const withdrawnAt = new Date(appInfo.updatedAt);
          const reapplyDate = new Date(withdrawnAt);
          reapplyDate.setDate(reapplyDate.getDate() + 60);
          const daysLeft = Math.ceil(
            (reapplyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
        }

        return {
          ...job,
          isSaved: savedJobIds.includes(job.id),
          isApplied: appInfo ? !isWithdrawn : false,
          isWithdrawn,
          reapplyDaysLeft,
        };
      });
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
