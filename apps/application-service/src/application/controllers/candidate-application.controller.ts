import {Controller, Post, Body, Param, UseGuards, Request, Get, Query} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiBearerAuth} from '@nestjs/swagger';
import {ApplicationService} from '../application.service';
import {ManualApplyDto} from '../dto/manual-apply.dto';
import {QuickApplyDto} from '../dto/quick-apply.dto';
import {GetMyApplicationsDto} from '../dto/get-my-applications.dto';
import {MyApplicationResponseDto} from '../dto/my-application-response.dto';
import {JwtAuthGuard} from '../../common/guards/jwt-auth.guard';
import {RolesGuard} from '../../common/guards/roles.guard';
import {Roles} from '@ai-job-portal/common';
import {UserRole} from '@ai-job-portal/common';

@Controller('applications')
export class CandidateApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post(':jobId/quick-apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({summary: 'Quick apply to a job as a candidate'})
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
  quickApply(@Param('jobId') jobId: string, @Body() quickApplyDto: QuickApplyDto, @Request() req) {
    return this.applicationService.quickApply(jobId, quickApplyDto, req.user);
  }

  @Post(':jobId/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({summary: 'Manual apply to a job with selected resume'})
  @ApiResponse({
    status: 201,
    description: 'Job applied successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - consent missing, job inactive, or invalid resume.',
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
    @Param('jobId') jobId: string,
    @Body() manualApplyDto: ManualApplyDto,
    @Request() req,
  ) {
    return this.applicationService.manualApply(jobId, manualApplyDto, req.user);
  }

  @Get('my-applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiTags('Candidate Jobs')
  @ApiOperation({summary: 'Get all applied jobs for the authenticated candidate'})
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully.',
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
    return this.applicationService.getMyApplications(req.user, query.status);
  }
}
