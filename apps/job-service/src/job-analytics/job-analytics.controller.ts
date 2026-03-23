import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
  @ApiOperation({
    summary: 'Share job',
    description: `Records that a user shared a job posting via a specific channel.
This endpoint is **public** — works for both logged-in and anonymous users.

**Supported share channels:**
- \`whatsapp\` — User tapped "Share via WhatsApp" (frontend opens \`https://wa.me/?text=...\`)
- \`email\` — User tapped "Share via Email" (frontend opens \`mailto:?subject=...&body=...\`)
- \`linkedin\` — User tapped "Share on LinkedIn" (frontend opens \`https://www.linkedin.com/sharing/share-offsite/?url=...\`)
- \`twitter\` — User tapped "Share on Twitter/X" (frontend opens \`https://twitter.com/intent/tweet?url=...&text=...\`)
- \`facebook\` — User tapped "Share on Facebook" (frontend opens \`https://www.facebook.com/sharer/sharer.php?u=...\`)
- \`copy_link\` — User clicked "Copy Link" (frontend copies the job URL to clipboard using \`navigator.clipboard.writeText()\`)

Employer can later view aggregated share stats via the analytics endpoint`,
  })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job being shared',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: TrackShareDto,
    examples: {
      copy_link: {
        summary: 'Copy Link',
        description: 'User copied the job URL to clipboard',
        value: { shareChannel: 'copy_link' },
      },
      whatsapp: {
        summary: 'WhatsApp',
        description: 'User shared via WhatsApp',
        value: { shareChannel: 'whatsapp' },
      },
      linkedin: {
        summary: 'LinkedIn',
        description: 'User shared on LinkedIn',
        value: { shareChannel: 'linkedin' },
      },
      email: {
        summary: 'Email',
        description: 'User shared via Email',
        value: { shareChannel: 'email' },
      },
      twitter: {
        summary: 'Twitter/X',
        description: 'User shared on Twitter/X',
        value: { shareChannel: 'twitter' },
      },
      facebook: {
        summary: 'Facebook',
        description: 'User shared on Facebook',
        value: { shareChannel: 'facebook' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Share event tracked and share links returned',
    schema: {
      example: {
        message: 'Share links generated successfully',
        data: {
          shareLinks: {
            jobUrl: 'https://yoursite.com/jobs/550e8400-e29b-41d4-a716-446655440000',
            whatsapp:
              'https://wa.me/?text=Check%20out%20this%20job%3A%20Senior%20React%20Developer%20at%20Acme%20Corp%20https%3A%2F%2Fyoursite.com%2Fjobs%2F550e8400',
            email:
              'mailto:?subject=Job%20Opportunity%3A%20Senior%20React%20Developer%20at%20Acme%20Corp&body=...',
            linkedin:
              'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fyoursite.com%2Fjobs%2F550e8400',
            twitter:
              'https://twitter.com/intent/tweet?url=https%3A%2F%2Fyoursite.com%2Fjobs%2F550e8400&text=...',
            facebook:
              'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fyoursite.com%2Fjobs%2F550e8400',
          },
        },
        status: 'success',
        statusCode: 201,
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
  @Public()
  @ApiOperation({
    summary: 'Get share statistics for a job',
    description: `Returns the total share count and breakdown by channel for a specific job.
This is a **public** endpoint — anyone can view share stats.

**Response example:**
\`\`\`json
{
  "message": "Share stats fetched successfully",
  "data": {
    "totalShares": 42,
    "sharesByChannel": {
      "whatsapp": 15,
      "linkedin": 10,
      "copy_link": 8,
      "email": 5,
      "twitter": 3,
      "facebook": 1
    }
  }
}
\`\`\``,
  })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Share stats retrieved', type: ShareStatsResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getShareStats(@Param('jobId', ParseUUIDPipe) jobId: string) {
    const stats = await this.analyticsService.getShareStats(jobId);
    return { message: 'Share stats fetched successfully', data: stats };
  }

  @Get('analytics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get full job analytics (employer only)',
    description: `Returns comprehensive analytics for a job posting including views, shares, and application counts.
**Requires authentication** — only the employer who posted the job can access this.

Optionally filter by date range using \`startDate\` and \`endDate\` query params.`,
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
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const analytics = await this.analyticsService.getJobAnalytics(userId, jobId, query);
    return { message: 'Analytics fetched successfully', data: analytics };
  }
}
