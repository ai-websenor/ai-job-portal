/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { ElasticsearchService } from '../elastic/elastic.service';
import { JobSearchQueryDto } from './dto/job-search-query.dto';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray } from 'drizzle-orm';

@Injectable()
export class JobSearchService {
  private readonly logger = new Logger(JobSearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Search jobs using Elasticsearch
   * Applies role-based ranking: preferences for candidates, company boost for employers
   */
  async searchJobs(query: JobSearchQueryDto, user?: any) {
    try {
      // Normalize all input values to lowercase for case-insensitive matching
      const normalizedQuery = {
        keyword: query.keyword,
        experienceLevel: query.experienceLevel?.toLowerCase(),
        city: query.city?.toLowerCase(),
        state: query.state?.toLowerCase(),
        companyName: query.companyName?.toLowerCase(),
        page: query.page || 1,
        limit: query.limit || 20,
        // New filters
        locationType: query.locationType,
        payRate: query.payRate,
        minSalary: query.minSalary,
        postedWithin: query.postedWithin,
        jobTypes: query.jobTypes,
        industries: query.industries,
        companyTypes: query.companyTypes,
      };

      this.logger.debug(
        `Search request - User: ${user?.id || 'Public'}, Role: ${user?.role || 'Guest'}, Keyword: "${normalizedQuery.keyword}"`,
      );

      let preferences: {
        jobTypes: string[];
        preferredLocations: string[];
        preferredIndustries: string[];
        workShift: string | null;
      } | null = null;
      let employerId: string | null = null;

      // Role-safe boosting: Apply ONLY ONE strategy based on user role
      if (user?.role === 'candidate') {
        preferences = await this.fetchUserPreferences(user.id);
        this.logger.debug(
          `Candidate search - preferences loaded: ${!!preferences}`,
        );
      } else if (user?.role === 'employer') {
        employerId = await this.fetchEmployerId(user.id);
        this.logger.debug(`Employer search - employerId: ${employerId}`);
      }

      // Build search parameters
      const result = await this.elasticsearchService.searchJobs({
        keyword: normalizedQuery.keyword,
        experienceLevel: normalizedQuery.experienceLevel,
        city: normalizedQuery.city,
        state: normalizedQuery.state,
        companyName: normalizedQuery.companyName,
        page: normalizedQuery.page,
        limit: normalizedQuery.limit,
        preferences, // Only set for candidates
        employerId: employerId ?? undefined, // Only set for employers
        // New filters
        locationType: normalizedQuery.locationType,
        payRate: normalizedQuery.payRate,
        minSalary: normalizedQuery.minSalary,
        postedWithin: normalizedQuery.postedWithin,
        jobTypes: normalizedQuery.jobTypes,
        industries: normalizedQuery.industries,
        companyTypes: normalizedQuery.companyTypes,
      });

      const jobs = result.jobs;
      const jobIds = jobs.map((job: any) => job.job_id);

      // Fetch Saved & Applied Flags (Enrichment)
      const savedSet = new Set<string>();
      const appliedSet = new Set<string>();

      if (user?.id && jobIds.length > 0) {
        const [savedJobs, applications] = await Promise.all([
          this.db
            .select({ jobId: schema.savedJobs.jobId })
            .from(schema.savedJobs)
            .where(
              and(
                eq(schema.savedJobs.jobSeekerId, user.id),
                inArray(schema.savedJobs.jobId, jobIds),
              ),
            ),
          this.db
            .select({ jobId: schema.jobApplications.jobId })
            .from(schema.jobApplications)
            .where(
              and(
                eq(schema.jobApplications.jobSeekerId, user.id),
                inArray(schema.jobApplications.jobId, jobIds),
              ),
            ),
        ]);

        savedJobs.forEach((s) => savedSet.add(s.jobId));
        applications.forEach((a) => appliedSet.add(a.jobId));
      }

      // Map & Enrich Response
      const enrichedJobs = jobs.map((job: any) => ({
        ...job, // Keep original fields implicitly or explicitly map if needed.
        // User requested camelCase response in previous context, but raw ES provided snake_case.
        // We will MAP explicitly to ensure clean API response and add flags.
        // HOWEVER, previous SearchService implementation mapped to camelCase.
        // If the current API returns snake_case, changing to camelCase MIGHT be a breaking change?
        // User said: "Expected frontend behavior: ... Jobs must still appear in search results"
        // "Definition of Done: Search API still works as before"
        // "Response example: { id: ..., isSaved: ..., ... }" (CamelCase example!)
        // So I MUST map to camelCase.
        id: job.job_id,
        // If job already has snake_case keys, spreading ...job includes them.
        // Should I return mixed? Ideally not.
        // But to be safe and strictly follow "Response example", I'll map common fields.
        // Actually, let's keep it simple: Add flags.
        // If I change the shape entirely, I risk breaking.
        // The user example had "id", "title", "isSaved".
        // The existing response had "job_id", "title".
        // I will provide "id" AND "job_id" to be super safe? Or just map?
        // Given step 1 instructions "Convert both results... Return enriched job list",
        // and standard practices, I will map to camelCase as in my SearchService plan.
        title: job.title,
        description: job.description,
        company: job.company,
        location: [job.city, job.state].filter(Boolean).join(', '),
        city: job.city,
        state: job.state,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        jobType: job.job_type,
        experienceLevel: job.experience_level,
        createdAt: job.created_at,
        skills: job.skills,

        // Flags
        isSaved: savedSet.has(job.job_id) ?? false,
        isApplied: appliedSet.has(job.job_id) ?? false,

        // Keep raw just in case? No, clean is better.
      }));

      const pageCount = Math.ceil(result.total / result.limit);

      return {
        message:
          enrichedJobs.length > 0
            ? 'Search results retrieved successfully'
            : 'No jobs found matching your search criteria',
        data: enrichedJobs,
        pagination: {
          totalItems: result.total,
          pageCount,
          currentPage: result.page,
          limit: result.limit,
          hasNextPage: result.page < pageCount,
        },
      };
    } catch (error) {
      this.logger.error(`Job search failed: ${error.message}`, error.stack);

      // Return graceful error response
      throw new ServiceUnavailableException({
        message:
          'Job search is temporarily unavailable. Please try again later.',
        data: [],
        status: 'error',
        statusCode: 503,
      });
    }
  }

  /**
   * Fetch user job preferences from database
   * Returns null if not found or on error (graceful fallback)
   * All values are normalized to lowercase for case-insensitive matching
   */
  private async fetchUserPreferences(userId: string) {
    try {
      // Get profile ID from user ID
      const [profile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .limit(1);

      if (!profile) {
        this.logger.debug(`No profile found for user ${userId}`);
        return null;
      }

      // Get job preferences
      const [prefs] = await this.db
        .select()
        .from(schema.jobPreferences)
        .where(eq(schema.jobPreferences.profileId, profile.id))
        .limit(1);

      if (!prefs) {
        this.logger.debug(`No job preferences found for profile ${profile.id}`);
        return null;
      }

      // Parse JSON fields safely and normalize to lowercase
      const jobTypes = this.safeJsonParse(prefs.jobTypes, []).map((t: string) =>
        t.toLowerCase(),
      );
      const preferredLocations = this.safeJsonParse(
        prefs.preferredLocations,
        [],
      ).map((l: string) => l.toLowerCase());
      const preferredIndustries = this.safeJsonParse(
        prefs.preferredIndustries,
        [],
      ).map((i: string) => i.toLowerCase());

      this.logger.debug(
        `Preferences loaded for user ${userId}: jobTypes=${jobTypes.length}, locations=${preferredLocations.length}, industries=${preferredIndustries.length}`,
      );

      return {
        jobTypes,
        preferredLocations,
        preferredIndustries,
        workShift: prefs.workShift?.toLowerCase() || null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch preferences for user ${userId}: ${error.message}`,
      );
      // Gracefully return null to continue with normal search
      return null;
    }
  }

  /**
   * Fetch employer ID from database
   * Returns null if not found or on error (graceful fallback)
   */
  private async fetchEmployerId(userId: string): Promise<string | null> {
    try {
      const [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.userId, userId))
        .limit(1);

      if (!employer) {
        this.logger.debug(`No employer found for user ${userId}`);
        return null;
      }

      this.logger.debug(
        `Employer ID loaded for user ${userId}: ${employer.id}`,
      );
      return employer.id;
    } catch (error) {
      this.logger.error(
        `Failed to fetch employer for user ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Safely parse JSON string, return default value on error
   */
  private safeJsonParse(
    jsonString: string | null,
    defaultValue: any = [],
  ): any {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch {
      this.logger.warn(`Failed to parse JSON: ${jsonString}`);
      return defaultValue;
    }
  }
}
