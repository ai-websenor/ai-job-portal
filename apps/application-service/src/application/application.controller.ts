import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationService } from './application.service';
import { CurrentUser, Roles, RolesGuard, PaginationDto } from '@ai-job-portal/common';
import { ApplyJobDto, UpdateApplicationStatusDto, QuickApplyDto } from './dto';

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
}
