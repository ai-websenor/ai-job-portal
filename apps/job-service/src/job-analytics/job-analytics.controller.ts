import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
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
  async trackShare(
    @Param('jobId') jobId: string,
    @Body() dto: TrackShareDto,
    @CurrentUser('sub') userId: string | null,
  ) {
    const result = await this.analyticsService.trackShare(jobId, userId, dto);
    return { message: 'Share tracked successfully', data: result };
  }

  @Get('share-stats')
  @Public()
  @ApiOperation({ summary: 'Get job share statistics' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Share stats retrieved' })
  async getShareStats(@Param('jobId') jobId: string) {
    const stats = await this.analyticsService.getShareStats(jobId);
    return { message: 'Share stats fetched successfully', data: stats };
  }

  @Get('analytics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get job analytics (employer only)' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAnalytics(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    const analytics = await this.analyticsService.getJobAnalytics(userId, jobId, query);
    return { message: 'Analytics fetched successfully', data: analytics };
  }
}
