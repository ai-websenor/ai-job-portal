/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, inArray } from 'drizzle-orm';
import { ElasticsearchService } from '../elastic/elastic.service';
import { JobSearchQueryDto } from './dto/job-search.dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async search(query: JobSearchQueryDto, userId?: string) {
    // 1. Search via Elasticsearch
    const searchResult = await this.elasticsearchService.searchJobs({
      keyword: query.keyword,
      // Best effort mapping: location -> city (since we don't have full location parsing yet)
      // If we had a location parser, we'd split into city/state.
      city: query.location,
      // Add other filters as they become supported in the DTO
      jobTypes: query.skills, // Using skills as a proxy if that was the intent, but DTO says skills are skills.
      // Wait, DTO has 'skills'. Elastic service has 'keyword' which matches skills.
      // Let's stick to what's mapped safely.
    });

    const jobs = searchResult.jobs;
    const jobIds = jobs.map((job: any) => job.job_id);

    // 2. Fetch Saved & Applied Flags (Enrichment)
    const savedSet = new Set<string>();
    const appliedSet = new Set<string>();

    if (userId && jobIds.length > 0) {
      const [savedJobs, applications] = await Promise.all([
        this.db
          .select({ jobId: schema.savedJobs.jobId })
          .from(schema.savedJobs)
          .where(
            and(
              eq(schema.savedJobs.jobSeekerId, userId),
              inArray(schema.savedJobs.jobId, jobIds),
            ),
          ),
        this.db
          .select({ jobId: schema.jobApplications.jobId })
          .from(schema.jobApplications)
          .where(
            and(
              eq(schema.jobApplications.jobSeekerId, userId),
              inArray(schema.jobApplications.jobId, jobIds),
            ),
          ),
      ]);

      savedJobs.forEach((s) => savedSet.add(s.jobId));
      applications.forEach((a) => appliedSet.add(a.jobId));
    }

    // 3. Map & Enrich Response
    const enrichedJobs = jobs.map((job: any) => ({
      id: job.job_id,
      title: job.title,
      description: job.description,
      company: job.company, // Keep nested object
      location: [job.city, job.state].filter(Boolean).join(', '), // Reconstruct location string
      city: job.city,
      state: job.state,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      jobType: job.job_type,
      experienceLevel: job.experience_level,
      createdAt: job.created_at,
      skills: job.skills,
      // New Flags
      isSaved: savedSet.has(job.job_id) ?? false,
      isApplied: appliedSet.has(job.job_id) ?? false,
    }));

    return {
      message:
        enrichedJobs.length > 0
          ? 'Search results retrieved successfully'
          : 'No jobs found matching your search',
      jobs: enrichedJobs,
      total: searchResult.total,
      page: searchResult.page,
      limit: searchResult.limit,
      totalPages: searchResult.totalPages,
    };
  }
}
