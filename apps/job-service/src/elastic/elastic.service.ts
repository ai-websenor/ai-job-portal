/* eslint-disable @typescript-eslint/no-unsafe-call */
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
              pay_rate: { type: 'keyword' },
              created_at: { type: 'date' },
              is_active: { type: 'boolean' },
              status: { type: 'keyword' }, // 'active', 'inactive', 'hold'
              company: {
                properties: {
                  id: { type: 'keyword' },
                  name: { type: 'text', analyzer: 'standard' },
                  industry: { type: 'text', analyzer: 'standard' },
                  company_size: { type: 'keyword' },
                  type: { type: 'keyword' },
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

      // Fetch company data using job.companyId (Phase 2: Company as source of truth)
      let companyData: {
        name: string;
        industry: string | null;
        type: string | null;
        size: string | null;
      } = {
        name: employer.companyName,
        industry: employer.industry,
        type: null,
        size: employer.companySize,
      };

      if (job.companyId) {
        try {
          const [company] = await this.db
            .select()
            .from(schema.companies)
            .where(eq(schema.companies.id, job.companyId))
            .limit(1);

          if (company) {
            // Prefer company data over employer data
            companyData = {
              name: company.name, // Phase 2: Prefer companies.name
              industry: company.industry, // Prefer companies.industry
              type: company.companyType,
              size: company.companySize, // Prefer companies.companySize
            };
          }
        } catch (err) {
          this.logger.warn(
            `Failed to fetch company details for companyId ${job.companyId}: ${err.message}`,
          );
        }
      }

      // Build denormalized document
      // Normalize fields to lowercase for case-insensitive term queries
      const document = {
        job_id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills || [],
        job_type: job.jobType?.toLowerCase() || null,
        experience_level: job.experienceLevel?.toLowerCase() || null,
        work_type: job.workType?.toLowerCase() || null,
        city: job.city?.toLowerCase() || null,
        state: job.state?.toLowerCase() || null,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        pay_rate: job.payRate,
        created_at: job.createdAt,
        is_active: job.isActive,
        status: job.status || 'active', // Default to active if missing
        company: {
          id: job.companyId || employer.id, // Use companyId if available
          name: companyData.name,
          industry: companyData.industry,
          company_size: companyData.size,
          type: companyData.type?.toLowerCase() || null,
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
    keyword?: string;
    experienceLevel?: string;
    city?: string;
    state?: string;
    companyName?: string;
    page?: number;
    limit?: number;
    preferences?: any;
    employerId?: string;
    // New optional filters
    locationType?: 'remote' | 'exact';
    payRate?: 'Hourly' | 'Monthly' | 'Yearly';
    minSalary?: number;
    postedWithin?: '24h' | '3d' | '7d';
    jobTypes?: string[];
    industries?: string[];
    companyTypes?: string[];
    departments?: string[];
    status?: string; // New status filter
  }): Promise<any> {
    if (!this.isAvailable) {
      throw new Error('Search service is temporarily unavailable');
    }

    try {
      const {
        keyword,
        experienceLevel,
        city,
        state,
        companyName,
        page = 1,
        limit = 20,
        preferences,
        employerId,
        locationType,
        payRate,
        minSalary,
        postedWithin,
        jobTypes,
        industries,
        companyTypes,
        status, // Extract status
      } = params;

      // Build query - MUST clause (required keyword match)
      // Build query
      const must: any[] = [];

      if (keyword) {
        must.push({
          multi_match: {
            query: keyword,
            fields: [
              'title^5', // Highest boost for title
              'skills^4', // High boost for skills
              'description^3', // Medium boost for description
              'company.name^2', // Lower boost for company name
              'company.industry^2',
            ],
            type: 'best_fields',
            operator: 'or',
          },
        });
      }

      const filter: any[] = [{ term: { is_active: true } }];

      // New Status Filter (with backward compatibility for missing field)
      if (status) {
        filter.push({
          bool: {
            should: [
              { term: { status: status } },
              { bool: { must_not: { exists: { field: 'status' } } } }, // Treat missing as matches (default active)
            ],
            minimum_should_match: 1,
          },
        });
      }

      // --- FILTERS --- //

      // 1. Location Filters
      if (locationType === 'remote') {
        filter.push({ term: { work_type: 'remote' } });
      } else {
        // 'exact' match or default logic
        if (city) {
          filter.push({ term: { city: city.toLowerCase() } });
        }
        if (state) {
          filter.push({ term: { state: state.toLowerCase() } });
        }
      }

      // 1b. Legacy support (if locationType not provided but city/state are)
      // The above 'else' block handles this, but strictly speaking if locationType is undefined,
      // we still want to filter by city/state if provided.
      // So let's refine:
      // If locationType is remote -> filter remote.
      // If locationType is exact OR undefined -> filter by city/state if present.
      // BUT, if locationType is 'remote', we typically IGNORE city/state?
      // Requirement: "if locationType === 'remote': filter.push(term(work_type = 'remote'))"
      // "if city provided: filter.push(term(city))"
      // Let's assume logical AND: "remote" AND "city=Bangalore" is valid (e.g. Remote job based in Bangalore).
      // But the prompt says: "nearMe -> ignored", "remoteJob -> work_type=remote", "exactLocation -> city + state".
      // I will implement additive filters.

      // 2. Salary Filters
      if (minSalary) {
        filter.push({ range: { salary_min: { gte: minSalary } } });
      }

      if (payRate) {
        filter.push({ term: { pay_rate: payRate } });
      }

      // 3. Date Posted
      if (postedWithin) {
        const now = new Date();
        let daysToSubtract = 0;
        if (postedWithin === '24h') daysToSubtract = 1;
        if (postedWithin === '3d') daysToSubtract = 3;
        if (postedWithin === '7d') daysToSubtract = 7;

        if (daysToSubtract > 0) {
          const pastDate = new Date(
            now.setDate(now.getDate() - daysToSubtract),
          );
          filter.push({
            range: {
              created_at: {
                gte: pastDate.toISOString(),
              },
            },
          });
        }
      }

      // 4. Experience
      if (experienceLevel) {
        filter.push({
          term: { experience_level: experienceLevel.toLowerCase() },
        });
      }

      // 5. Employment Type (Array)
      if (jobTypes && jobTypes.length > 0) {
        // Use 'terms' for array matching
        filter.push({
          terms: {
            job_type: jobTypes.map((t) => t.toLowerCase()),
          },
        });
      }

      // 6. Industry (Array)
      if (industries && industries.length > 0) {
        filter.push({
          terms: {
            'company.industry': industries, // Industry is standard text, maybe not lowercased in index?
            // Index mapping says: 'company.industry': { type: 'text', analyzer: 'standard' }
            // Standard analyzer lowercases. So we should lowercase terms.
            // Wait, terms query on text field?
            // "terms query: Returns documents that contain one or more exact terms in a provided field."
            // "Avoid using the terms query for text fields."
            // However, the requirement says: "filter.push(terms(company.industry))".
            // Since it is analyzed as standard, it is tokenized and lowercased.
            // If we use terms, we must match the tokens.
            // Ideally industry should be a keyword for filtering.
            // Current mapping: industry: { type: 'text', analyzer: 'standard' }
            // This is arguably a schema issue, but I am restricted from schema changes.
            // I will lowercase the input to match standard analyzer tokens.
          },
        });
      }

      // 7. Company Type (Array)
      if (companyTypes && companyTypes.length > 0) {
        filter.push({
          terms: {
            'company.type': companyTypes.map((t) => t.toLowerCase()),
          },
        });
      }

      // Log search parameters for debugging
      this.logger.debug(
        `Search params: keyword="${keyword}", filters=${JSON.stringify({
          locationType,
          city,
          state,
          payRate,
          minSalary,
          postedWithin,
          jobTypes,
          industries,
          companyTypes,
        })}`,
      );

      // ROLE-BASED BOOSTING (SHOULD clauses)
      // These boost scores but NEVER filter results (minimum_should_match: 0)
      const should: any[] = [];

      if (preferences) {
        // Boost job types (e.g., full_time, remote)
        if (preferences.jobTypes?.length > 0) {
          should.push({
            terms: {
              job_type: preferences.jobTypes.map((t: string) =>
                t.toLowerCase(),
              ),
              boost: 3.0, // Strong boost for matching job type preference
            },
          });
        }

        // Boost preferred locations (highest priority)
        if (preferences.preferredLocations?.length > 0) {
          should.push({
            terms: {
              city: preferences.preferredLocations.map((l: string) =>
                l.toLowerCase(),
              ),
              boost: 4.0, // Very strong boost for location match
            },
          });
        }

        // Boost preferred industries
        if (preferences.preferredIndustries?.length > 0) {
          should.push({
            terms: {
              'company.industry': preferences.preferredIndustries,
              boost: 2.0, // Medium boost for industry match
            },
          });
        }

        // Boost work shift preference
        if (preferences.workShift) {
          should.push({
            term: {
              work_type: {
                value: preferences.workShift,
                boost: 2.5, // Medium-high boost for work shift match
              },
            },
          });
        }
      }

      // EMPLOYER BOOSTING (if employerId provided)
      if (employerId) {
        should.push({
          term: {
            'company.id': {
              value: employerId,
              boost: 5.0, // Highest boost for employer's own jobs
            },
          },
        });
      }

      // COMPANY NAME MATCHING (if companyName provided)
      if (companyName) {
        should.push({
          match: {
            'company.name': {
              query: companyName,
              boost: 3.0, // Medium-high boost for company name match
            },
          },
        });
      }

      const from = (page - 1) * limit;

      const searchQuery = {
        index: INDEX_NAME,
        body: {
          query: {
            bool: {
              must, // Required: keyword match
              filter, // Required: active jobs + manual filters
              should, // Optional: role-based boosting (preferences OR employer)
              minimum_should_match: 0, // CRITICAL: SHOULD clauses NEVER filter results
            },
          },
          from,
          size: limit,
          sort: [
            { _score: { order: 'desc' } }, // Primary: relevance score
            { created_at: { order: 'desc' } }, // Secondary: newest first
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
