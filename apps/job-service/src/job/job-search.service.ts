/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ElasticsearchService } from '../elastic/elastic.service';
import { JobSearchQueryDto } from './dto/job-search-query.dto';

@Injectable()
export class JobSearchService {
  private readonly logger = new Logger(JobSearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * Search jobs using Elasticsearch
   * Returns graceful error response if Elasticsearch is unavailable
   */
  async searchJobs(query: JobSearchQueryDto) {
    try {
      const result = await this.elasticsearchService.searchJobs({
        keyword: query.keyword,
        jobType: query.jobType,
        experienceLevel: query.experienceLevel,
        city: query.city,
        state: query.state,
        page: query.page || 1,
        limit: query.limit || 20,
      });

      return {
        message:
          result.jobs.length > 0
            ? 'Search results retrieved successfully'
            : 'No jobs found matching your search criteria',
        data: result.jobs,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
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
}
