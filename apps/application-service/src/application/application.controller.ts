import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationService } from './application.service';
import { CurrentUser, Roles, RolesGuard, PaginationDto } from '@ai-job-portal/common';
import {
  ApplyJobDto,
  UpdateApplicationStatusDto,
  QuickApplyDto,
  CandidateApplicationsQueryDto,
  EmployerApplicationsQueryDto,
  EmployerJobsSummaryQueryDto,
  EmployerJobApplicantsQueryDto,
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
  getCandidateApplications(
    @CurrentUser('sub') userId: string,
    @Query() query: CandidateApplicationsQueryDto,
  ) {
    return this.applicationService.getCandidateApplications(userId, query);
  }

  @Get('job/:jobId')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get applications for a job' })
  getJobApplications(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('jobId') jobId: string,
    @Query() query: PaginationDto,
  ) {
    return this.applicationService.getJobApplications(userId, jobId, query, userRole);
  }

  @Get('employer/all-applications')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all applications for employer jobs' })
  @ApiResponse({ status: 200, description: 'List of applications for employer jobs' })
  @ApiResponse({ status: 403, description: 'Employer profile required' })
  async getAllEmployerApplications(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query() query: EmployerApplicationsQueryDto,
    @Query('scope') scope?: string,
  ) {
    const applications = await this.applicationService.getAllEmployerApplications(
      userId,
      query,
      userRole,
      scope,
    );
    return { message: 'applications fetched successfully', ...applications };
  }

  @Get('employer/summary')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get employer jobs summary with application counts' })
  @ApiResponse({ status: 200, description: 'Jobs summary with application counts' })
  @ApiResponse({ status: 403, description: 'Employer profile required' })
  async getEmployerApplicationsSummary(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query() query: EmployerJobsSummaryQueryDto,
    @Query('scope') scope?: string,
  ) {
    const summary = await this.applicationService.getEmployerApplicationsSummary(
      userId,
      query,
      userRole,
      scope,
    );
    return { message: 'summary fetched successfully', ...summary };
  }

  @Get('employer/applicants')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get applicants for a specific employer job' })
  @ApiResponse({ status: 200, description: 'List of applicants for the job' })
  @ApiResponse({ status: 403, description: 'Job not found or access denied' })
  async getEmployerJobApplicants(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query() query: EmployerJobApplicantsQueryDto,
  ) {
    const applicants = await this.applicationService.getEmployerJobApplicants(
      userId,
      query,
      userRole,
    );
    return { message: 'applicants fetched successfully', ...applicants };
  }

  @Get('analytics/candidate')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get candidate dashboard analytics counts' })
  @ApiResponse({ status: 200, description: 'Candidate analytics fetched successfully' })
  getCandidateAnalytics(@CurrentUser('sub') userId: string) {
    return this.applicationService.getCandidateAnalytics(userId);
  }

  @Get('analytics/employer')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get employer dashboard analytics counts' })
  @ApiResponse({ status: 200, description: 'Employer analytics fetched successfully' })
  getEmployerAnalytics(@CurrentUser('sub') userId: string) {
    return this.applicationService.getEmployerAnalytics(userId);
  }

  @Get(':id/history')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get application tracking history/timeline' })
  @ApiResponse({ status: 200, description: 'Application history retrieved' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  getApplicationHistory(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.applicationService.getApplicationHistory(userId, id);
  }

  @Get(':applicationId/candidate-profile')
  @Roles('employer', 'super_employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get candidate profile for an application' })
  @ApiResponse({ status: 200, description: 'Candidate profile retrieved' })
  @ApiResponse({ status: 403, description: 'Access denied or employer profile required' })
  @ApiResponse({ status: 404, description: 'Application or candidate not found' })
  getCandidateProfileForApplication(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.applicationService.getCandidateProfileForApplication(
      userId,
      applicationId,
      userRole,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  getById(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
  ) {
    return this.applicationService.getById(id, userId, userRole);
  }

  @Put(':id/status')
  @Roles('employer', 'super_employer', 'candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update application status',
    description: `Update application status based on user role.

**Employer transitions:**
- applied → viewed, rejected
- viewed → shortlisted, rejected
- shortlisted → interview_scheduled, rejected
- interview_scheduled → hired, rejected

**Candidate transitions:**
- applied → withdrawn
- withdrawn → applied (re-apply)
- hired → offer_accepted, offer_rejected`,
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition for current state/role' })
  @ApiResponse({ status: 403, description: 'Access denied or invalid role for this status' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  updateStatus(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(userId, id, dto, userRole);
  }

  @Post(':id/withdraw')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Withdraw application' })
  withdraw(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.applicationService.withdraw(userId, id);
  }

  @Post(':id/notes')
  @Roles('employer', 'super_employer')
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
  async getResumeDownloadUrl(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
  ) {
    const result = await this.applicationService.getResumeDownloadUrl(userId, id, userRole);
    return { message: 'Download URL generated', data: result };
  }
}
