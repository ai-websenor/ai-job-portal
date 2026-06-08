import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomLogger } from '@ai-job-portal/logger';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { CandidateSearchService } from './candidate-search.service';
import { SearchCandidatesDto } from './dto';

@ApiTags('candidate-search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('candidates/search')
export class CandidateSearchController {
  private readonly logger = new CustomLogger();

  constructor(private readonly candidateSearchService: CandidateSearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search candidates with filters (employer only)',
    description: `Search public candidate profiles with multiple filter options. Private profiles are never returned.
All multi-value filters accept comma-separated values.

**Multi-value filters (comma-separated):**
- \`experienceLevels\` — \`0-1\`, \`1-2\`, \`3-5\`, \`5-10\`, \`10+\` (e.g. \`?experienceLevels=3-5,5-10\`)
- \`employmentTypes\` — \`full_time\`, \`part_time\`, \`contract\`, \`internship\`
- \`availability\` — \`immediate\`, \`15d\`, \`30d\`, \`notice\`
- \`skillIds\` — skill UUIDs

**Single-value filters:**
- \`query\` — text search across candidate name, headline, skill name and job title
- \`location\` — city/state/country (partial match)
- \`salaryMin\` / \`salaryMax\` — expected salary bounds (LPA)
- \`sortBy\` — \`relevance\` (default), \`recent\`, \`experience\`, \`salary\`

**Pagination:** \`page\` (default 1), \`limit\` (default 10). Each result includes \`isSaved\` for the current employer.`,
  })
  @ApiResponse({ status: 200, description: 'Candidates fetched successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — employer role required' })
  async searchCandidates(@CurrentUser('sub') userId: string, @Query() dto: SearchCandidatesDto) {
    this.logger.info('Searching candidates', 'CandidateSearchController', { userId });
    const result = await this.candidateSearchService.searchCandidates(userId, dto);
    return { message: 'Candidates fetched successfully', ...result };
  }
}
