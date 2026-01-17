import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { JobAnalyticsService } from './job-analytics.service';
import { TrackShareDto, AnalyticsQueryDto } from './dto';

@ApiTags('job-analytics')
@Controller('jobs/:jobId')
export class JobAnalyticsController {
  constructor(private readonly analyticsService: JobAnalyticsService) {}

  @Post('share')
  @Public()
  @ApiOperation({ summary: 'Track job share' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 201, description: 'Share tracked' })
  trackShare(
    @Param('jobId') jobId: string,
    @Body() dto: TrackShareDto,
    @CurrentUser('sub') userId: string | null,
  ) {
    return this.analyticsService.trackShare(jobId, userId, dto);
  }

  @Get('share-stats')
  @Public()
  @ApiOperation({ summary: 'Get job share statistics' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Share stats retrieved' })
  getShareStats(@Param('jobId') jobId: string) {
    return this.analyticsService.getShareStats(jobId);
  }

  @Get('analytics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get job analytics (employer only)' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  getAnalytics(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getJobAnalytics(userId, jobId, query);
  }
}
