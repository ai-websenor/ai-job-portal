import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { JobAnalyticsService } from './job-analytics.service';
import {
  TrackShareDto,
  AnalyticsQueryDto,
  ShareStatsResponseDto,
  JobAnalyticsResponseDto,
} from './dto';

@ApiTags('Job Sharing & Analytics')
@Controller('jobs/:jobId')
export class JobAnalyticsController {
  constructor(private readonly analyticsService: JobAnalyticsService) {}

  @Post('share')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get share links for a job (optionally track share event)',
    description: `Returns ready-to-use share links for all supported channels.
This endpoint is **public** — works for both logged-in and anonymous users.

**Usage:**
- Send empty body \`{}\` to just get share links
- Send \`{ "shareChannel": "whatsapp" }\` to get links AND record the share for analytics

**Supported share channels (for tracking):**
- \`whatsapp\` — Shared via WhatsApp
- \`email\` — Shared via Email
- \`linkedin\` — Shared on LinkedIn
- \`twitter\` — Shared on Twitter/X
- \`facebook\` — Shared on Facebook
- \`copy_link\` — Copied the job link to clipboard`,
  })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job being shared',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: TrackShareDto,
    required: false,
    examples: {
      no_tracking: {
        summary: 'Get links only (no tracking)',
        description: 'Returns share links without recording a share event',
        value: {},
      },
      copy_link: {
        summary: 'Copy Link + track',
        value: { shareChannel: 'copy_link' },
      },
      whatsapp: {
        summary: 'WhatsApp + track',
        value: { shareChannel: 'whatsapp' },
      },
      linkedin: {
        summary: 'LinkedIn + track',
        value: { shareChannel: 'linkedin' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Share links returned (and share event tracked if shareChannel provided)',
    schema: {
      example: {
        message: 'Share links generated successfully',
        data: {
          shareLinks: {
            jobUrl: 'https://yoursite.com/jobs/550e8400-e29b-41d4-a716-446655440000',
            whatsapp:
              'https://wa.me/?text=Check%20out%20this%20job%3A%20Senior%20React%20Developer%20at%20Acme%20Corp%20...',
            email:
              'mailto:?subject=Job%20Opportunity%3A%20Senior%20React%20Developer%20at%20Acme%20Corp&body=...',
            linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=...',
            twitter: 'https://twitter.com/intent/tweet?url=...&text=...',
            facebook: 'https://www.facebook.com/sharer/sharer.php?u=...',
          },
        },
        status: 'success',
        statusCode: 200,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid shareChannel value' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async trackShare(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: TrackShareDto,
    @CurrentUser('sub') userId: string | null,
  ) {
    const result = await this.analyticsService.trackShare(jobId, userId, dto);
    return { message: 'Share links generated successfully', data: result };
  }

  @Get('share-stats')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get share statistics for a job (employer only)',
    description:
      'Returns the total share count and breakdown by channel. Only the job owner can access this.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Share stats retrieved', type: ShareStatsResponseDto })
  @ApiResponse({ status: 403, description: 'Not the job owner' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getShareStats(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    const stats = await this.analyticsService.getShareStats(userId, jobId, userRole);
    return { message: 'Share stats fetched successfully', data: stats };
  }

  @Get('analytics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get full job analytics (employer only)',
    description: `Returns comprehensive analytics for a job posting including views, shares, and application counts.
**Requires authentication** — only the employer who posted the job can access this.

Filter by date range using \`startDate\` and \`endDate\` query params (format: YYYY-MM-DD).`,
  })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Analytics retrieved', type: JobAnalyticsResponseDto })
  @ApiResponse({ status: 403, description: 'Not the job owner' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getAnalytics(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const analytics = await this.analyticsService.getJobAnalytics(userId, jobId, query, userRole);
    return { message: 'Analytics fetched successfully', data: analytics };
  }
}
