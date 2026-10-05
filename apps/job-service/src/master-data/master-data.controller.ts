import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '@ai-job-portal/common';
import { MasterDataService } from './master-data.service';
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from './master-data.rules';

/**
 * Shared Swagger prose. The three endpoints behave identically, so the
 * description is written once and the label swapped in.
 */
const searchDescription = (label: string) =>
  `
Searchable dropdown for the **${label}** field on the employer job form.

**What comes back:**
- Active rows only (\`isActive: true\`)
- **Both** \`master-typed\` (admin-curated) and \`user-typed\` (typed by an employer and not yet reviewed)
  — a ${label} someone typed last week is offered to the next employer straight away, the same way skills work.
  \`type\` is included on each row so the form can mark the two differently.
- Ordered exact match first, then names starting with \`q\`, then the rest alphabetically
- An empty \`q\` returns the first page alphabetically, so the list is useful before typing

**Requires:** employer JWT — this is used while posting a job.
`.trim();

const searchQueryDocs = (example: string) => ({
  q: {
    name: 'q',
    required: false,
    type: String,
    example,
    description: 'Case-insensitive partial match on name. Omit for the first page alphabetically.',
  },
  limit: {
    name: 'limit',
    required: false,
    type: Number,
    example: DEFAULT_SEARCH_LIMIT,
    description: `Rows to return. Default ${DEFAULT_SEARCH_LIMIT}, clamped to 1–${MAX_SEARCH_LIMIT}.`,
  },
});

const titleDocs = searchQueryDocs('developer');
const qualificationDocs = searchQueryDocs('b.tech');
const certificationDocs = searchQueryDocs('aws');

const exampleResponse = (rows: { id: string; name: string; type: string }[]) => ({
  status: 200,
  description: 'Matching rows, best match first',
  schema: {
    example: {
      data: rows,
      message: 'Operation successful',
      status: 'success',
      statusCode: 200,
    },
  },
});

@ApiTags('job-titles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('job-titles')
export class JobTitleController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search job titles (employer job form)',
    description: searchDescription('job title'),
  })
  @ApiQuery(titleDocs.q)
  @ApiQuery(titleDocs.limit)
  @ApiResponse(
    exampleResponse([
      { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Developer', type: 'master-typed' },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Developer Advocate',
        type: 'user-typed',
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'Backend Developer',
        type: 'master-typed',
      },
    ]),
  )
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — employer role required' })
  async search(@Query('q') q?: string, @Query('limit') limit?: string) {
    const data = await this.masterDataService.searchJobTitles(q, limit);
    return { message: 'Job titles fetched successfully', data };
  }
}

@ApiTags('qualifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('qualifications')
export class QualificationController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search qualifications (employer job form)',
    description: searchDescription('qualification'),
  })
  @ApiQuery(qualificationDocs.q)
  @ApiQuery(qualificationDocs.limit)
  @ApiResponse(
    exampleResponse([
      { id: 'd4e5f6a7-b8c9-0123-defa-234567890123', name: 'B.Tech', type: 'master-typed' },
      {
        id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
        name: 'B.Tech in Computer Science',
        type: 'master-typed',
      },
    ]),
  )
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — employer role required' })
  async search(@Query('q') q?: string, @Query('limit') limit?: string) {
    const data = await this.masterDataService.searchQualifications(q, limit);
    return { message: 'Qualifications fetched successfully', data };
  }
}

@ApiTags('certifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('certifications')
export class CertificationController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search certifications (employer job form)',
    description: searchDescription('certification'),
  })
  @ApiQuery(certificationDocs.q)
  @ApiQuery(certificationDocs.limit)
  @ApiResponse(
    exampleResponse([
      {
        id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
        name: 'AWS Certified Solutions Architect',
        type: 'master-typed',
      },
      {
        id: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
        name: 'AWS Certified Developer',
        type: 'user-typed',
      },
    ]),
  )
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — employer role required' })
  async search(@Query('q') q?: string, @Query('limit') limit?: string) {
    const data = await this.masterDataService.searchCertifications(q, limit);
    return { message: 'Certifications fetched successfully', data };
  }
}
