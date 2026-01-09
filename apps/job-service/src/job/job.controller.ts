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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';
import { JobSearchService } from './job-search.service';

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
  @ApiTags('Public Jobs')
  @ApiOperation({ summary: 'Search jobs using Elasticsearch' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: 503,
    description: 'Search service temporarily unavailable',
  })
  searchJobsHttp(@Query() query: JobSearchQueryDto) {
    return this.jobSearchService.searchJobs(query);
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
    summary: 'Get all jobs created by the authenticated employer',
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
