import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '@ai-job-portal/common';
import { SearchJobsDto } from './dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('jobs')
  @Public()
  @ApiOperation({ summary: 'Search jobs with filters' })
  async searchJobs(@Query() dto: SearchJobsDto) {
    const result = await this.searchService.searchJobs(dto);
    return { message: 'Jobs fetched successfully', ...result };
  }

  @Get('jobs/popular')
  @Public()
  @ApiOperation({ summary: 'Get popular jobs based on engagement' })
  async getPopularJobs(@Query() dto: SearchJobsDto) {
    const result = await this.searchService.getPopularJobs(dto);
    return { message: 'Popular jobs fetched successfully', ...result };
  }

  @Get('jobs/trending')
  @Public()
  @ApiOperation({ summary: 'Get trending jobs based on recent activity' })
  async getTrendingJobs(@Query() dto: SearchJobsDto) {
    const result = await this.searchService.getTrendingJobs(dto);
    return { message: 'Trending jobs fetched successfully', ...result };
  }

  @Get('jobs/:id/similar')
  @Public()
  @ApiOperation({ summary: 'Get similar jobs' })
  @ApiQuery({ name: 'limit', required: false })
  async getSimilarJobs(@Param('id') id: string, @Query('limit') limit?: number) {
    const jobs = await this.searchService.getSimilarJobs(id, limit || 5);
    return { message: 'Similar jobs fetched successfully', data: jobs };
  }

  @Get('jobs/featured')
  @Public()
  @ApiOperation({ summary: 'Get featured jobs' })
  @ApiQuery({ name: 'limit', required: false })
  async getFeaturedJobs(@Query('limit') limit?: number) {
    const jobs = await this.searchService.getFeaturedJobs(limit || 10);
    return { message: 'Featured jobs fetched successfully', data: jobs };
  }

  @Get('jobs/recent')
  @Public()
  @ApiOperation({ summary: 'Get recent jobs' })
  @ApiQuery({ name: 'limit', required: false })
  async getRecentJobs(@Query('limit') limit?: number) {
    const jobs = await this.searchService.getRecentJobs(limit || 20);
    return { message: 'Recent jobs fetched successfully', data: jobs };
  }
}
