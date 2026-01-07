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
import { QuickApplyDto } from './dto/quick-apply.dto';
import { ManualApplyDto } from './dto/manual-apply.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
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
  @ApiOperation({ summary: 'Find all jobs' })
  @ApiResponse({ status: 200, description: 'Return all jobs.' })
  findAllHttp(@Query() query: any) {
    return this.jobService.findAll(query);
  }

  @GrpcMethod('JobService', 'FindAllJobs')
  findAll(data: any) {
    return this.jobService.findAll(data);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
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

  @Get(':id')
  @ApiOperation({ summary: 'Find a job by id' })
  @ApiResponse({ status: 200, description: 'Return the job.' })
  findOneHttp(@Param('id') id: string) {
    return this.jobService.findOne(id);
  }

  @GrpcMethod('JobService', 'FindOneJob')
  findOne(data: { id: string }) {
    return this.jobService.findOne(data.id);
  }

  @Post(':id/quick-apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quick apply to a job as a candidate' })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - job inactive or resume missing.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Already applied to this job.',
  })
  quickApplyHttp(
    @Param('id') jobId: string,
    @Body() quickApplyDto: QuickApplyDto,
    @Request() req,
  ) {
    return this.jobService.quickApply(jobId, quickApplyDto, req.user);
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manual apply to a job with selected resume' })
  @ApiResponse({
    status: 201,
    description: 'Job applied successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - consent missing, job inactive, or invalid resume.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Already applied to this job.',
  })
  manualApplyHttp(
    @Param('id') jobId: string,
    @Body() manualApplyDto: ManualApplyDto,
    @Request() req,
  ) {
    return this.jobService.manualApply(jobId, manualApplyDto, req.user);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a job for later as a candidate' })
  @ApiResponse({
    status: 201,
    description: 'Job saved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - job inactive.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Job already saved.',
  })
  saveJobHttp(@Param('id') jobId: string, @Request() req) {
    return this.jobService.saveJob(jobId, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully updated.',
  })
  updateHttp(@Param('id') id: string, @Body() data: UpdateJobDto) {
    return this.jobService.update(id, data);
  }

  @GrpcMethod('JobService', 'UpdateJob')
  update(data: UpdateJobDto & { id: string }) {
    return this.jobService.update(data.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully deleted.',
  })
  removeHttp(@Param('id') id: string) {
    return this.jobService.remove(id);
  }

  @GrpcMethod('JobService', 'RemoveJob')
  remove(data: { id: string }) {
    return this.jobService.remove(data.id);
  }
}
