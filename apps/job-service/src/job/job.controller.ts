/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { JobSearchQueryDto } from './dto/job-search-query.dto';
import { SaveJobParamsDto } from './dto/save-job-params.dto';
import { JobDiscoveryQueryDto } from './dto/job-discovery-query.dto';
import { RelevantJobsQueryDto } from './dto/relevant-jobs-query.dto';
import { RecommendedJobsQueryDto } from './dto/recommended-jobs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';
import { JobSearchService } from './job-search.service';

import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly jobSearchService: JobSearchService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Jobs')
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({
    status: 201,
    description: 'The job has been successfully created.',
  })
  createHttp(@Body() data: CreateJobDto, @Request() req) {
    return this.jobService.create(data, req.user);
  }

  @GrpcMethod('JobService', 'CreateJob')
  create(data: CreateJobDto & { employerId: string }) {
    // For gRPC, we expect employerId to be passed in data
    // validation is handled by the caller (API Gateway)
    return this.jobService.create(data, data.employerId);
  }

  @Get('trending')
  @ApiTags('Public Jobs')
  @ApiOperation({ summary: 'Jobs gaining high activity recently' })
  @ApiResponse({ status: 200, description: 'Return trending jobs.' })
  async getTrendingJobs(@Query() query: JobDiscoveryQueryDto) {
    const jobs = await this.jobService.getTrendingJobs(query);
    return { ...jobs, message: 'Trending Jobs fetched successfully' };
  }

  @Get('popular')
  @ApiTags('Public Jobs')
  @ApiOperation({ summary: 'Jobs with consistently high engagement' })
  @ApiResponse({ status: 200, description: 'Return popular jobs.' })
  async getPopularJobs(@Query() query: JobDiscoveryQueryDto) {
    const jobs = await this.jobService.getPopularJobs(query);
    return { ...jobs, message: 'Popular Jobs fetched successfully' };
  }

  @Get('relevant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({
    summary: 'Jobs personalized based on your preferences and profile',
    description:
      'Deterministic rule-based matching (not AI). Returns empty if not actively looking or preferences missing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Relevant jobs retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - candidate role required',
  })
  async getRelevantJobs(@Query() query: RelevantJobsQueryDto, @Request() req) {
    const jobs = await this.jobService.getRelevantJobs(query, req.user);
    return { ...jobs, message: 'Relevant jobs fetched successfully' };
  }

  @Get('recommended')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({
    summary: 'Jobs recommended based on your activity and interests',
    description:
      'Rule-based recommendations using applications, saved searches, and preferences (Non-AI)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommended jobs retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - candidate role required',
  })
  async getRecommendedJobs(
    @Query() query: RecommendedJobsQueryDto,
    @Request() req,
  ) {
    const jobs = await this.jobService.getRecommendedJobs(query, req.user);
    return { ...jobs, message: 'Recommended jobs fetched successfully' };
  }

  @Get()
  @ApiTags('Public Jobs')
  @ApiOperation({ summary: 'Find all jobs' })
  @ApiResponse({ status: 200, description: 'Return all jobs.' })
  findAllHttp(@Query() query: JobQueryDto) {
    return this.jobService.findAll(query);
  }

  @GrpcMethod('JobService', 'FindAllJobs')
  findAll(data: any) {
    return this.jobService.findAll(data);
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs', 'Employer Jobs')
  @ApiOperation({
    summary: 'Search jobs using Elasticsearch (public/authenticated)',
    description:
      'Role-based search: Candidates receive preference-based ranking. Employers see their own jobs boosted first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 503,
    description: 'Search service temporarily unavailable',
  })
  searchJobsHttp(@Query() query: JobSearchQueryDto, @Request() req) {
    // User is optional (public search)
    return this.jobSearchService.searchJobs(query, req.user);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({
    summary: 'Get all saved jobs for the authenticated candidate',
  })
  @ApiResponse({
    status: 200,
    description: 'List of saved jobs retrieved successfully.',
  })
  getSavedJobsHttp(@Request() req) {
    return this.jobService.getSavedJobs(req.user);
  }

  @Get('employer/my-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Jobs')
  @ApiOperation({
    summary:
      'Get all jobs created by the authenticated employer for dashboard purposes',
  })
  @ApiResponse({
    status: 200,
    description: 'List of employer jobs retrieved successfully.',
  })
  getMyJobsHttp(@Request() req, @Query() query: JobQueryDto) {
    return this.jobService.findMyJobs(req.user, query);
  }

  @Get('employer/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Jobs')
  @ApiOperation({
    summary: 'Get a specific job created by the authenticated employer',
  })
  @ApiResponse({
    status: 200,
    description: 'Job retrieved successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the job owner.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  getMyJobByIdHttp(@Param('id') id: string, @Request() req) {
    return this.jobService.findMyJobById(id, req.user);
  }

  @Get(':id')
  @ApiTags('Public Jobs')
  @ApiOperation({ summary: 'Find a job by id' })
  @ApiResponse({ status: 200, description: 'Return the job.' })
  findOneHttp(@Param('id') id: string) {
    return this.jobService.findOne(id);
  }

  @GrpcMethod('JobService', 'FindOneJob')
  findOne(data: { id: string }) {
    return this.jobService.findOne(data.id);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({ summary: 'Save a job for later as a candidate' })
  @ApiResponse({
    status: 201,
    description: 'Job saved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - job inactive or invalid UUID.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Job already saved.',
  })
  saveJobHttp(@Param() params: SaveJobParamsDto, @Request() req) {
    return this.jobService.saveJob(params.id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Jobs')
  @ApiOperation({ summary: 'Update a job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully updated.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the job owner.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  updateHttp(
    @Param('id') id: string,
    @Body() data: UpdateJobDto,
    @Request() req,
  ) {
    return this.jobService.update(id, data, req.user);
  }

  @GrpcMethod('JobService', 'UpdateJob')
  update(data: UpdateJobDto & { id: string; userId: string }) {
    // For gRPC, userId should be passed from the caller
    return this.jobService.update(data.id, data, { id: data.userId });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Jobs')
  @ApiOperation({ summary: 'Delete a job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully deleted.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the job owner.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  removeHttp(@Param('id') id: string, @Request() req) {
    return this.jobService.remove(id, req.user);
  }

  @GrpcMethod('JobService', 'RemoveJob')
  remove(data: { id: string; userId: string }) {
    // For gRPC, userId should be passed from the caller
    return this.jobService.remove(data.id, { id: data.userId });
  }
}
