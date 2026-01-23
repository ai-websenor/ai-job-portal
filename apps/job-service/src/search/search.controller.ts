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
  searchJobs(@Query() dto: SearchJobsDto) {
    return this.searchService.searchJobs(dto);
  }

  @Get('jobs/popular')
  @Public()
  @ApiOperation({ summary: 'Get popular jobs based on engagement' })
  getPopularJobs(@Query() dto: SearchJobsDto) {
    return this.searchService.getPopularJobs(dto);
  }

  @Get('jobs/trending')
  @Public()
  @ApiOperation({ summary: 'Get trending jobs based on recent activity' })
  getTrendingJobs(@Query() dto: SearchJobsDto) {
    return this.searchService.getTrendingJobs(dto);
  }

  @Get('jobs/:id/similar')
  @Public()
  @ApiOperation({ summary: 'Get similar jobs' })
  @ApiQuery({ name: 'limit', required: false })
  getSimilarJobs(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.searchService.getSimilarJobs(id, limit || 5);
  }

  @Get('jobs/featured')
  @Public()
  @ApiOperation({ summary: 'Get featured jobs' })
  @ApiQuery({ name: 'limit', required: false })
  getFeaturedJobs(@Query('limit') limit?: number) {
    return this.searchService.getFeaturedJobs(limit || 10);
  }

  @Get('jobs/recent')
  @Public()
  @ApiOperation({ summary: 'Get recent jobs' })
  @ApiQuery({ name: 'limit', required: false })
  getRecentJobs(@Query('limit') limit?: number) {
    return this.searchService.getRecentJobs(limit || 20);
  }
}
