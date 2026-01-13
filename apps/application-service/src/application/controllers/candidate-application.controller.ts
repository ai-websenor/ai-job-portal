import { Controller, Post, Body, Param, UseGuards, Request, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApplicationService } from '../application.service';
import { ManualApplyDto } from '../dto/manual-apply.dto';
import { QuickApplyDto } from '../dto/quick-apply.dto';
import { GetMyApplicationsDto } from '../dto/get-my-applications.dto';
import { MyApplicationResponseDto } from '../dto/my-application-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';
import { JobIdParamDto } from '../../common/dto/uuid-param.dto';

@Controller('applications')
export class CandidateApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post(':jobId/quick-apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Applications')
  @ApiOperation({ summary: 'Quick apply to a job as a candidate' })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job to apply to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID, job inactive or resume missing.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Already applied to this job.',
  })
  quickApply(@Param() params: JobIdParamDto, @Body() quickApplyDto: QuickApplyDto, @Request() req) {
    return this.applicationService.quickApply(params.jobId, quickApplyDto, req.user);
  }

  @Post(':jobId/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Applications')
  @ApiOperation({ summary: 'Manual apply to a job with selected resume' })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job to apply to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Job applied successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID, consent missing, job inactive, or invalid resume.',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Already applied to this job.',
  })
  manualApply(
    @Param() params: JobIdParamDto,
    @Body() manualApplyDto: ManualApplyDto,
    @Request() req,
  ) {
    return this.applicationService.manualApply(params.jobId, manualApplyDto, req.user);
  }

  @Get('my-applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Applications')
  @ApiOperation({ summary: 'Get all applied jobs for the authenticated candidate' })
  @ApiResponse({
    status: 200,
    description:
      'Applications retrieved successfully. Returns paginated response with "meta" if page/limit params are used.',
    type: [MyApplicationResponseDto],
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
    description: 'Forbidden - user is not a candidate.',
  })
  getMyApplications(@Query() query: GetMyApplicationsDto, @Request() req) {
    return this.applicationService.getMyApplications(
      req.user,
      query.status,
      query.page,
      query.limit,
    );
  }
}
