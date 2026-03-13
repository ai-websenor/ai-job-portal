import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationQueryDto, RefreshRecommendationsDto } from './dto';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('jobs')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get AI-powered personalized job recommendations' })
  @ApiResponse({ status: 200, description: 'List of recommended jobs with scores and reasons' })
  async getJobRecommendations(
    @CurrentUser('sub') userId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const result = await this.recommendationService.getRecommendations(userId, query);
    return { message: 'Recommended jobs fetched successfully', ...result };
  }

  @Post('jobs/refresh')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Refresh recommendations (clears cache for fresh AI results)' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async refreshRecommendations(
    @CurrentUser('sub') userId: string,
    @Body() dto: RefreshRecommendationsDto,
  ) {
    return this.recommendationService.refreshRecommendations(userId, dto?.forceRefresh);
  }

  @Post('jobs/:jobId/action')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Log user action on recommendation (for ML feedback)' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async logAction(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() body: { action: 'viewed' | 'applied' | 'saved' | 'ignored' | 'not_interested'; position?: number },
  ) {
    return this.recommendationService.logRecommendationAction(userId, jobId, body.action, body.position);
  }

  @Get('jobs/:jobId/similar')
  @Public()
  @ApiOperation({ summary: 'Get jobs similar to a specific job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async getSimilarJobs(
    @Param('jobId') jobId: string,
    @Query('limit') limit?: number,
  ) {
    return this.recommendationService.getSimilarJobs(jobId, limit || 5);
  }
}
