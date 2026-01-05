import { Controller, Post, Body, Get, Param, Patch, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, description: 'The job has been successfully created.' })
  createHttp(@Body() data: CreateJobDto, @Request() req) {
    console.log('[JobController.createHttp] req.user:', req.user); // Temporary debug log
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job' })
  @ApiResponse({ status: 200, description: 'The job has been successfully updated.' })
  updateHttp(@Param('id') id: string, @Body() data: UpdateJobDto) {
    return this.jobService.update(id, data);
  }

  @GrpcMethod('JobService', 'UpdateJob')
  update(data: UpdateJobDto & { id: string }) {
    return this.jobService.update(data.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  @ApiResponse({ status: 200, description: 'The job has been successfully deleted.' })
  removeHttp(@Param('id') id: string) {
    return this.jobService.remove(id);
  }

  @GrpcMethod('JobService', 'RemoveJob')
  remove(data: { id: string }) {
    return this.jobService.remove(data.id);
  }
}
