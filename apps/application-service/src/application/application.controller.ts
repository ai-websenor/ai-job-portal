import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationService } from './application.service';
import { CurrentUser, Roles, RolesGuard, PaginationDto } from '@ai-job-portal/common';
import {
  ApplyJobDto,
  UpdateApplicationStatusDto,
  QuickApplyDto,
  EmployerApplicationsQueryDto,
  EmployerJobsSummaryQueryDto,
} from './dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Apply to job' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  apply(@CurrentUser('sub') userId: string, @Body() dto: ApplyJobDto) {
    return this.applicationService.apply(userId, dto);
  }

  @Post('quick-apply')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Quick apply to a job using profile resume' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Resume required for quick apply' })
  @ApiResponse({ status: 403, description: 'Candidate profile required' })
  @ApiResponse({ status: 404, description: 'Job not found or not active' })
  @ApiResponse({ status: 409, description: 'Already applied to this job' })
  async quickApply(@CurrentUser('sub') userId: string, @Body() dto: QuickApplyDto) {
    const result = await this.applicationService.quickApply(userId, dto);
    return { message: 'Application submitted successfully', data: result };
  }

  @Get('my-applications')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get candidate applications' })
  getCandidateApplications(@CurrentUser('sub') userId: string, @Query() query: PaginationDto) {
    return this.applicationService.getCandidateApplications(userId, query);
  }

  @Get('job/:jobId')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get applications for a job' })
  getJobApplications(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Query() query: PaginationDto,
  ) {
    return this.applicationService.getJobApplications(userId, jobId, query);
  }

  @Get('employer/all-applications')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all applications for employer jobs' })
  @ApiResponse({ status: 200, description: 'List of applications for employer jobs' })
  @ApiResponse({ status: 403, description: 'Employer profile required' })
  async getAllEmployerApplications(
    @CurrentUser('sub') userId: string,
    @Query() query: EmployerApplicationsQueryDto,
  ) {
    const applications = await this.applicationService.getAllEmployerApplications(userId, query);
    return { message: 'applications fetched successfully', data: applications };
  }

  @Get('employer/summary')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get employer jobs summary with application counts' })
  @ApiResponse({ status: 200, description: 'Jobs summary with application counts' })
  @ApiResponse({ status: 403, description: 'Employer profile required' })
  async getEmployerApplicationsSummary(
    @CurrentUser('sub') userId: string,
    @Query() query: EmployerJobsSummaryQueryDto,
  ) {
    const summary = await this.applicationService.getEmployerApplicationsSummary(userId, query);
    return { message: 'summary fetched successfully', ...summary };
  }

  @Get(':applicationId/candidate-profile')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get candidate profile for an application' })
  @ApiResponse({ status: 200, description: 'Candidate profile retrieved' })
  @ApiResponse({ status: 403, description: 'Access denied or employer profile required' })
  @ApiResponse({ status: 404, description: 'Application or candidate not found' })
  getCandidateProfileForApplication(
    @CurrentUser('sub') userId: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.applicationService.getCandidateProfileForApplication(userId, applicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  getById(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.applicationService.getById(id, userId);
  }

  @Put(':id/status')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update application status' })
  updateStatus(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(userId, id, dto);
  }

  @Post(':id/withdraw')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Withdraw application' })
  withdraw(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.applicationService.withdraw(userId, id);
  }

  @Post(':id/notes')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Add note to application' })
  addNote(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: { content: string },
  ) {
    return this.applicationService.addNote(userId, id, dto.content);
  }

  @Get(':id/resume-url')
  @ApiOperation({
    summary: 'Get pre-signed download URL for application resume (valid for 1 hour)',
  })
  @ApiResponse({ status: 200, description: 'Download URL generated' })
  @ApiResponse({ status: 404, description: 'Application or resume not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getResumeDownloadUrl(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.applicationService.getResumeDownloadUrl(userId, id);
    return { message: 'Download URL generated', data: result };
  }
}
