import {Controller, Get, Param, UseGuards, Request, Query} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiBearerAuth} from '@nestjs/swagger';
import {ApplicationService} from '../application.service';
import {GetEmployerApplicantsDto} from '../dto/get-employer-applicants.dto';
import {EmployerApplicantResponseDto} from '../dto/employer-applicant-response.dto';
import {MyJobsResponseDto} from '../dto/my-jobs-response.dto';
import {GetJobApplicationsDto} from '../dto/get-job-applications.dto';
import {JobApplicationResponseDto} from '../dto/job-application-response.dto';
import {JwtAuthGuard} from '../../common/guards/jwt-auth.guard';
import {RolesGuard} from '../../common/guards/roles.guard';
import {Roles} from '@ai-job-portal/common';
import {UserRole} from '@ai-job-portal/common';

@Controller('applications')
export class EmployerApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get('employer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Applications')
  @ApiOperation({summary: 'Get all applicants for  employer all jobs'})
  @ApiResponse({
    status: 200,
    description: 'Applicants retrieved successfully.',
    type: [EmployerApplicantResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid status value.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - no token provided or invalid token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not an employer.',
  })
  getAllApplicantsForEmployer(@Query() query: GetEmployerApplicantsDto, @Request() req) {
    return this.applicationService.getAllApplicantsForEmployer(req.user, query.status);
  }

  @Get('jobs/:jobId/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Applications')
  @ApiOperation({summary: 'Get all applications for a specific job (employer only)'})
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully.',
    type: [JobApplicationResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - job does not belong to this employer.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  getApplicationsForJob(
    @Param('jobId') jobId: string,
    @Query() query: GetJobApplicationsDto,
    @Request() req,
  ) {
    return this.applicationService.getApplicationsForJob(jobId, req.user, query.status);
  }

  @Get('employer/my-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiTags('Employer Applications')
  @ApiOperation({
    summary: 'Get all jobs created by the authenticated employer (for dashboard purposes)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of employer jobs with application counts and status.',
    type: [MyJobsResponseDto],
  })
  getMyJobs(@Request() req) {
    return this.applicationService.getMyJobs(req.user);
  }
}
