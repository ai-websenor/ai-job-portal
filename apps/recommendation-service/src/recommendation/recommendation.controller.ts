import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiExcludeEndpoint,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { RecommendationService } from './recommendation.service';
import {
  CandidateJobGroupJobsQueryDto,
  CandidateJobGroupParamDto,
  RecommendationQueryDto,
} from './dto';

const RECOMMENDATION_RESPONSE_EXAMPLE = {
  message: 'Recommended jobs fetched successfully',
  data: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      title: 'Senior Full Stack Developer',
      description: 'We are looking for an experienced Full Stack Developer...',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      jobType: ['full_time'],
      workMode: ['remote'],
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
      company: { id: 'c001', name: 'TechVista Solutions', logoUrl: 'https://...' },
      category: { id: 'cat001', name: 'Software Development' },
      isSaved: false,
      isApplied: false,
      isWithdrawn: false,
      reapplyDaysLeft: null,
      recommendationScore: 92,
      recommendationReason:
        'Strong match — JavaScript, React, TypeScript skills align perfectly with Senior Full Stack role',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      title: 'Frontend Developer (React)',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      jobType: ['full_time'],
      workMode: ['hybrid'],
      skills: ['JavaScript', 'React', 'TypeScript', 'CSS'],
      company: { id: 'c002', name: 'DataDrive Analytics', logoUrl: 'https://...' },
      category: { id: 'cat001', name: 'Software Development' },
      isSaved: true,
      isApplied: false,
      isWithdrawn: false,
      reapplyDaysLeft: null,
      recommendationScore: 78,
      recommendationReason: 'Good frontend skill match, location differs',
    },
  ],
  status: 'success',
  statusCode: 200,
  pagination: {
    totalJob: 10,
    pageCount: 2,
    currentPage: 1,
    hasNextPage: true,
  },
};

const CANDIDATE_JOB_GROUPS_RESPONSE_EXAMPLE = {
  message: 'Candidate job groups fetched successfully',
  data: [
    { id: 'hybrid', name: 'Hybrid Jobs', count: 6 },
    { id: 'remote', name: 'Remote Jobs', count: 8 },
    { id: 'entry_level', name: 'Entry-Level Jobs', count: 4 },
    { id: 'experienced', name: 'Experienced-Level Jobs', count: 12 },
    { id: 'high_paid', name: 'High-Paid Jobs', count: 5 },
    { id: 'most_applied', name: 'Most Applied Jobs', count: 10 },
  ],
  status: 'success',
  statusCode: 200,
};

const CANDIDATE_JOB_GROUP_JOBS_RESPONSE_EXAMPLE = {
  message: 'Candidate job group jobs fetched successfully',
  group: { id: 'remote', name: 'Remote Jobs' },
  data: [
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      title: 'Frontend Developer (React)',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      jobType: ['full_time'],
      workMode: ['remote'],
      skills: ['JavaScript', 'React', 'TypeScript', 'CSS'],
      company: { id: 'c002', name: 'DataDrive Analytics', logoUrl: 'https://...' },
      category: { id: 'cat001', name: 'Software Development' },
      isSaved: true,
      isApplied: false,
      isWithdrawn: false,
      reapplyDaysLeft: null,
      recommendationScore: 88,
      recommendationReason: 'Matched your skills, education, job preferences, and experience level',
    },
  ],
  pagination: {
    totalJob: 8,
    pageCount: 1,
    currentPage: 1,
    hasNextPage: false,
  },
  source: 'profile-matching',
  status: 'success',
  statusCode: 200,
};

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('jobs')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get AI-powered personalized job recommendations',
    description:
      "Returns AI-powered job recommendations stored in the database. Recommendations are refreshed automatically when the candidate's profile, skills, or preferences change. Applied, saved, inactive, and expired jobs are filtered out at read time.",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Number of results (1-50)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiResponse({
    status: 200,
    description: 'AI-ranked job recommendations with relevance scores and reasons',
    content: { 'application/json': { example: RECOMMENDATION_RESPONSE_EXAMPLE } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — Bearer token required' })
  async getJobRecommendations(
    @CurrentUser('sub') userId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const result = await this.recommendationService.getRecommendations(userId, query);
    return { message: 'Recommended jobs fetched successfully', ...result };
  }

  // Legacy path alias: gateway routes /jobs/recommended → recommendation-service → this handler
  // Hidden from Swagger — same as GET /recommendations/jobs
  @Get('/jobs/recommended')
  @UseGuards(AuthGuard('jwt'))
  @ApiExcludeEndpoint()
  async getJobRecommendationsLegacy(
    @CurrentUser('sub') userId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const result = await this.recommendationService.getRecommendations(userId, query);
    return { message: 'Recommended jobs fetched successfully', ...result };
  }

  // Internal endpoint — called by user-service when profile/skills/preferences change
  @Post('jobs/internal/refresh')
  @Public()
  @ApiExcludeEndpoint()
  async refreshRecommendations(
    @Body()
    body: {
      userId: string;
    },
  ) {
    return this.recommendationService.refreshRecommendations(body.userId);
  }

  @Get('jobs/groups')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get candidate-matched job group counts',
    description:
      'Returns the six dashboard job groups with counts after filtering jobs against the logged-in candidate profile. This is deterministic DB matching and does not call the AI model. Matching considers skills, education, job preferences, and experience, and excludes jobs already applied to.',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate-matched group counts',
    content: { 'application/json': { example: CANDIDATE_JOB_GROUPS_RESPONSE_EXAMPLE } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized â€” Bearer token required' })
  async getCandidateJobGroups(@CurrentUser('sub') userId: string) {
    const data = await this.recommendationService.getCandidateJobGroups(userId);
    return { message: 'Candidate job groups fetched successfully', data };
  }

  @Get('jobs/groups/:groupId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get jobs for a candidate-matched group',
    description:
      'Returns paginated jobs for one dashboard group after candidate profile matching. Results are capped at 10 per page and sorted by profile relevance first, then the group-specific signal.',
  })
  @ApiParam({
    name: 'groupId',
    enum: ['hybrid', 'remote', 'entry_level', 'experienced', 'high_paid', 'most_applied'],
    example: 'remote',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Jobs per page. Maximum 10.',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate-matched jobs for group',
    content: { 'application/json': { example: CANDIDATE_JOB_GROUP_JOBS_RESPONSE_EXAMPLE } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized â€” Bearer token required' })
  async getCandidateJobGroupJobs(
    @CurrentUser('sub') userId: string,
    @Param() params: CandidateJobGroupParamDto,
    @Query() query: CandidateJobGroupJobsQueryDto,
  ) {
    const result = await this.recommendationService.getCandidateJobGroupJobs(
      userId,
      params.groupId,
      query,
    );
    return { message: 'Candidate job group jobs fetched successfully', ...result };
  }

  @Post('jobs/:jobId/action')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Log user action on a recommendation',
    description:
      'Tracks user interactions with recommended jobs for ML feedback (viewed, applied, saved, ignored, not_interested).',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job UUID',
    example: 'b0000000-0000-0000-0000-000000000001',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['viewed', 'applied', 'saved', 'ignored', 'not_interested'],
          example: 'viewed',
        },
        position: {
          type: 'number',
          description: 'Position in the recommendation list (0-indexed)',
          example: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Action logged',
    content: {
      'application/json': {
        example: {
          data: { success: true },
          message: 'Operation successful',
          status: 'success',
          statusCode: 201,
        },
      },
    },
  })
  async logAction(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body()
    body: {
      action: 'viewed' | 'applied' | 'saved' | 'ignored' | 'not_interested';
      position?: number;
    },
  ) {
    return this.recommendationService.logRecommendationAction(
      userId,
      jobId,
      body.action,
      body.position,
    );
  }

  @Get('jobs/:jobId/similar')
  @Public()
  @ApiOperation({
    summary: 'Get jobs similar to a specific job',
    description: 'Returns jobs in the same category as the given job. No auth required.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job UUID',
    example: 'b0000000-0000-0000-0000-000000000001',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 5,
    description: 'Number of similar jobs (default 5)',
  })
  @ApiResponse({ status: 200, description: 'List of similar jobs' })
  async getSimilarJobs(@Param('jobId') jobId: string, @Query('limit') limit?: number) {
    return this.recommendationService.getSimilarJobs(jobId, limit || 5);
  }
}
