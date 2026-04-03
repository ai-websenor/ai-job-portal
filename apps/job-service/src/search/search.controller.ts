import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '@ai-job-portal/common';
import { SearchJobsDto } from './dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('filters')
  @Public()
  @ApiOperation({
    summary: 'Get all active filter options grouped by type',
    description:
      'Returns all filter options grouped by type (experienceLevel, locationType, payRate, postedWithin, jobType, industry, department, companyType, salaryRange, sortBy). Use the returned values as filter inputs for GET /search/jobs.',
  })
  async getFilterOptions() {
    const data = await this.searchService.getFilterOptions();
    return { message: 'Filter options fetched successfully', data };
  }

  @Get('jobs')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search jobs with filters',
    description: `Search jobs with multiple filter options. All multi-value filters accept comma-separated values from GET /search/filters.

**Multi-value filters (comma-separated):**
- \`companyType\` — e.g. \`?companyType=startup,enterprise\`
- \`department\` — e.g. \`?department=Engineering,Marketing\` (maps to job Sub Category)
- \`experienceLevels\` — e.g. \`?experienceLevels=entry,mid,senior\`
- \`industry\` — e.g. \`?industry=IT,Finance,Healthcare\` (maps to job Category)
- \`jobType\` — e.g. \`?jobType=full_time,part_time,contract\`
- \`locationType\` — e.g. \`?locationType=remote,hybrid\`
- \`payRate\` — e.g. \`?payRate=monthly,yearly\`
- \`salaryRange\` — e.g. \`?salaryRange=6_10,10_15\` (LPA values from GET /search/filters → salaryRange; supports both \`_\` and \`-\` as separator)
- \`workModes\` — e.g. \`?workModes=remote,hybrid,onsite\`

**Single-value filters:**
- \`query\` — text search (supports wildcards: \`A*\`, \`*developer\`)
- \`company\` — company name (partial match)
- \`location\` — city/state/country (partial match)
- \`categoryId\` — job category UUID
- \`salaryMin\` / \`salaryMax\` — numeric salary bounds
- \`postedWithin\` — \`24h\`, \`3d\`, \`7d\`, \`30d\`, \`all\`
- \`sortBy\` — \`date\`, \`salary\`, \`salary_asc\`, \`salary_desc\`, \`relevance\``,
  })
  async searchJobs(@Query() dto: SearchJobsDto, @Req() req: any) {
    const userId = req.user?.sub || (req.headers['x-user-id'] as string | undefined);
    const result = await this.searchService.searchJobs(dto, userId);
    return { message: 'Jobs fetched successfully', ...result };
  }

  @Get('jobs/popular')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get popular jobs based on engagement' })
  async getPopularJobs(@Query() dto: SearchJobsDto, @Req() req: any) {
    const userId = req.user?.sub || (req.headers['x-user-id'] as string | undefined);
    const result = await this.searchService.getPopularJobs(dto, userId);
    return { message: 'Popular jobs fetched successfully', ...result };
  }

  @Get('jobs/trending')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trending jobs based on recent activity' })
  async getTrendingJobs(@Query() dto: SearchJobsDto, @Req() req: any) {
    const userId = req.user?.sub || (req.headers['x-user-id'] as string | undefined);
    const result = await this.searchService.getTrendingJobs(dto, userId);
    return { message: 'Trending jobs fetched successfully', ...result };
  }

  @Get('jobs/:id/similar')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get similar jobs' })
  @ApiQuery({ name: 'limit', required: false })
  async getSimilarJobs(@Param('id') id: string, @Query('limit') limit?: number, @Req() req?: any) {
    const userId = req?.user?.sub || (req?.headers['x-user-id'] as string | undefined);
    const jobs = await this.searchService.getSimilarJobs(id, limit || 5, userId);
    return { message: 'Similar jobs fetched successfully', data: jobs };
  }

  @Get('jobs/featured')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get featured jobs' })
  @ApiQuery({ name: 'limit', required: false })
  async getFeaturedJobs(@Query('limit') limit?: number, @Req() req?: any) {
    const userId = req?.user?.sub || (req?.headers['x-user-id'] as string | undefined);
    const jobs = await this.searchService.getFeaturedJobs(limit || 10, userId);
    return { message: 'Featured jobs fetched successfully', data: jobs };
  }

  @Get('jobs/recent')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent jobs' })
  @ApiQuery({ name: 'limit', required: false })
  async getRecentJobs(@Query('limit') limit?: number, @Req() req?: any) {
    const userId = req?.user?.sub || (req?.headers['x-user-id'] as string | undefined);
    const jobs = await this.searchService.getRecentJobs(limit || 20, userId);
    return { message: 'Recent jobs fetched successfully', data: jobs };
  }
}
