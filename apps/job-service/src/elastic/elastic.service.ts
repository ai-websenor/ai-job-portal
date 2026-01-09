/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { getElasticsearchConfig } from './elastic.config';

const INDEX_NAME = 'jobs_index';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly client: Client;
  private isAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    const config = getElasticsearchConfig(this.configService);
    this.client = new Client(config);
  }

  async onModuleInit() {
    await this.initializeIndex();
  }

  /**
   * Initialize Elasticsearch index with mappings
   * Safe to call multiple times - checks if index exists first
   */
  async initializeIndex(): Promise<void> {
    try {
      // Check if Elasticsearch is available
      await this.client.ping();
      this.isAvailable = true;
      this.logger.log('Elasticsearch connection established');

      // Check if index already exists
      const indexExists = await this.client.indices.exists({
        index: INDEX_NAME,
      });

      if (indexExists) {
        this.logger.log(
          `Index "${INDEX_NAME}" already exists, skipping creation`,
        );
        return;
      }

      // Create index with mappings
      await this.client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              job_id: { type: 'keyword' },
              title: { type: 'text', analyzer: 'standard' },
              description: { type: 'text', analyzer: 'standard' },
              skills: { type: 'text', analyzer: 'standard' },
              job_type: { type: 'keyword' },
              experience_level: { type: 'keyword' },
              work_type: { type: 'keyword' },
              city: { type: 'keyword' },
              state: { type: 'keyword' },
              salary_min: { type: 'integer' },
              salary_max: { type: 'integer' },
              created_at: { type: 'date' },
              is_active: { type: 'boolean' },
              company: {
                properties: {
                  id: { type: 'keyword' },
                  name: { type: 'text', analyzer: 'standard' },
                  industry: { type: 'text', analyzer: 'standard' },
                  company_size: { type: 'keyword' },
                },
              },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });

      this.logger.log(`Index "${INDEX_NAME}" created successfully`);
    } catch (error) {
      this.isAvailable = false;
      this.logger.error(
        `Failed to initialize Elasticsearch: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Index a job document (create or update)
   * Non-blocking - errors are logged but not thrown
   */
  async indexJob(jobId: string): Promise<void> {
    if (!this.isAvailable) {
      this.logger.warn('Elasticsearch is unavailable, skipping indexing');
      return;
    }

    try {
      // Fetch job from PostgreSQL
      const [job] = await this.db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.id, jobId))
        .limit(1);

      if (!job) {
        this.logger.warn(
          `Job ${jobId} not found in database, skipping indexing`,
        );
        return;
      }

      // Fetch employer data
      const [employer] = await this.db
        .select()
        .from(schema.employers)
        .where(eq(schema.employers.id, job.employerId))
        .limit(1);

      if (!employer) {
        this.logger.warn(
          `Employer ${job.employerId} not found, skipping indexing`,
        );
        return;
      }

      // Build denormalized document
      const document = {
        job_id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills || [],
        job_type: job.jobType,
        experience_level: job.experienceLevel,
        work_type: job.workType,
        city: job.city,
        state: job.state,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        created_at: job.createdAt,
        is_active: job.isActive,
        company: {
          id: employer.id,
          name: employer.companyName,
          industry: employer.industry,
          company_size: employer.companySize,
        },
      };

      // Index document
      await this.client.index({
        index: INDEX_NAME,
        id: jobId,
        document,
        refresh: 'false', // Don't wait for refresh
      });

      this.logger.debug(`Job ${jobId} indexed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to index job ${jobId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Bulk index all existing jobs from PostgreSQL
   * Used for initial indexing or rebuilding the index
   */
  async bulkIndexAllJobs(): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    if (!this.isAvailable) {
      throw new Error('Elasticsearch is not available');
    }

    try {
      // Fetch all active jobs from database
      const jobs = await this.db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.isActive, true));

      this.logger.log(`Starting bulk indexing of ${jobs.length} jobs`);

      let successCount = 0;
      let failedCount = 0;
      const batchSize = 100;

      // Process jobs in batches
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        this.logger.log(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)}`,
        );

        // Index each job in the batch
        for (const job of batch) {
          try {
            await this.indexJob(job.id);
            successCount++;
          } catch (error) {
            this.logger.error(
              `Failed to index job ${job.id}: ${error.message}`,
            );
            failedCount++;
          }
        }
      }

      this.logger.log(
        `Bulk indexing completed: ${successCount} successful, ${failedCount} failed`,
      );

      return {
        total: jobs.length,
        success: successCount,
        failed: failedCount,
      };
    } catch (error) {
      this.logger.error(`Bulk indexing failed: ${error.message}`, error.stack);
      throw new Error('Bulk indexing encountered an error');
    }
  }

  /**
   * Delete a job document from the index
   * Non-blocking - errors are logged but not thrown
   */
  async deleteJob(jobId: string): Promise<void> {
    if (!this.isAvailable) {
      this.logger.warn('Elasticsearch is unavailable, skipping deletion');
      return;
    }

    try {
      await this.client.delete({
        index: INDEX_NAME,
        id: jobId,
        refresh: 'false',
      });

      this.logger.debug(`Job ${jobId} deleted from index successfully`);
    } catch (error) {
      // Ignore 404 errors (document not found)
      if (error.meta?.statusCode === 404) {
        this.logger.debug(`Job ${jobId} not found in index, skipping deletion`);
        return;
      }

      this.logger.error(
        `Failed to delete job ${jobId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Search jobs using Elasticsearch
   * Returns empty array with error message if Elasticsearch is unavailable
   */
  async searchJobs(params: {
    keyword: string;
    jobType?: string;
    experienceLevel?: string;
    city?: string;
    state?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    if (!this.isAvailable) {
      throw new Error('Search service is temporarily unavailable');
    }

    try {
      const {
        keyword,
        jobType,
        experienceLevel,
        city,
        state,
        page = 1,
        limit = 20,
      } = params;

      // Build query
      const must: any[] = [
        {
          multi_match: {
            query: keyword,
            fields: [
              'title^3',
              'description^2',
              'skills^2',
              'company.name^2',
              'company.industry',
            ],
            type: 'best_fields',
            operator: 'or',
          },
        },
      ];

      const filter: any[] = [{ term: { is_active: true } }];

      // Normalize filter values to lowercase for case-insensitive matching
      const normalizedJobType = jobType?.toLowerCase();
      const normalizedExperienceLevel = experienceLevel?.toLowerCase();
      const normalizedCity = city?.toLowerCase();
      const normalizedState = state?.toLowerCase();

      if (normalizedJobType) {
        filter.push({ term: { job_type: normalizedJobType } });
      }

      if (normalizedExperienceLevel) {
        filter.push({ term: { experience_level: normalizedExperienceLevel } });
      }

      if (normalizedCity) {
        filter.push({ term: { city: normalizedCity } });
      }

      if (normalizedState) {
        filter.push({ term: { state: normalizedState } });
      }

      // Log search parameters for debugging
      this.logger.debug(
        `Search params: keyword="${keyword}", jobType="${normalizedJobType}", experienceLevel="${normalizedExperienceLevel}", city="${normalizedCity}", state="${normalizedState}"`,
      );

      const from = (page - 1) * limit;

      const searchQuery = {
        index: INDEX_NAME,
        body: {
          query: {
            bool: {
              must,
              filter,
            },
          },
          from,
          size: limit,
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } },
          ],
        },
      };

      // Log the complete search query for debugging
      this.logger.debug(
        `Elasticsearch query: ${JSON.stringify(searchQuery.body, null, 2)}`,
      );

      const response = await this.client.search(searchQuery);

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      // Log search results for debugging
      this.logger.debug(
        `Search returned ${hits.length} results out of ${total} total matches`,
      );

      return {
        jobs: hits.map((hit: any) => ({
          ...hit._source,
          score: hit._score,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw new Error('Search service encountered an error');
    }
  }
}
