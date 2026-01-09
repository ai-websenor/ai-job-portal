import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ElasticsearchService } from './elastic.service';

@Controller('elasticsearch')
@ApiTags('Admin')
export class BulkIndexController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Post('bulk-index')
  @ApiOperation({
    summary: 'Bulk index all existing jobs into Elasticsearch',
    description:
      'Admin endpoint to index all active jobs from PostgreSQL into Elasticsearch. Use this after initial setup or to rebuild the index.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk indexing completed',
    schema: {
      example: {
        message: 'Bulk indexing completed',
        totalJobs: 150,
        indexedSuccessfully: 148,
        failed: 2,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Elasticsearch service unavailable',
  })
  async bulkIndexJobs() {
    const result = await this.elasticsearchService.bulkIndexAllJobs();

    return {
      message: 'Bulk indexing completed',
      totalJobs: result.total,
      indexedSuccessfully: result.success,
      failed: result.failed,
    };
  }
}
