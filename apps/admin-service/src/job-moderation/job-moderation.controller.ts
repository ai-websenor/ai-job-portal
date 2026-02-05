import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  RolesGuard,
  Roles,
  CurrentUser,
  CurrentCompany,
  CompanyScoped,
  CompanyScopeGuard,
} from '@ai-job-portal/common';
import { JobModerationService } from './job-moderation.service';
import { ListJobsForModerationDto, ModerateJobDto, FlagJobDto, BulkModerateDto } from './dto';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, CompanyScopeGuard)
@Roles('admin', 'super_admin')
@Controller('jobs')
export class JobModerationController {
  constructor(private readonly jobModerationService: JobModerationService) {}

  @Get()
  @CompanyScoped() // Admin can only see jobs from their assigned company
  @ApiOperation({ summary: 'List jobs for moderation' })
  async listJobs(@CurrentCompany() companyId: string, @Query() dto: ListJobsForModerationDto) {
    return this.jobModerationService.listJobsForModeration(companyId, dto);
  }

  @Get('stats')
  @CompanyScoped() // Admin can only see stats for their assigned company
  @ApiOperation({ summary: 'Get moderation statistics' })
  async getModerationStats(@CurrentCompany() companyId: string) {
    return this.jobModerationService.getModerationStats(companyId);
  }

  @Get(':id')
  @CompanyScoped() // Admin can only view jobs from their assigned company
  @ApiOperation({ summary: 'Get job details for moderation' })
  async getJob(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.jobModerationService.getJobForModeration(companyId, id);
  }

  @Put(':id/moderate')
  @CompanyScoped() // Admin can only moderate jobs from their assigned company
  @ApiOperation({ summary: 'Approve or reject a job' })
  async moderateJob(
    @CurrentUser('sub') adminId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: ModerateJobDto,
  ) {
    return this.jobModerationService.moderateJob(adminId, companyId, id, dto);
  }

  @Put(':id/flag')
  @CompanyScoped() // Admin can only flag jobs from their assigned company
  @ApiOperation({ summary: 'Flag a job for review' })
  async flagJob(
    @CurrentUser('sub') adminId: string,
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() dto: FlagJobDto,
  ) {
    return this.jobModerationService.flagJob(adminId, companyId, id, dto);
  }

  @Post('bulk')
  @CompanyScoped() // Admin can only bulk moderate jobs from their assigned company
  @ApiOperation({ summary: 'Bulk approve/reject jobs' })
  async bulkModerate(
    @CurrentUser('sub') adminId: string,
    @CurrentCompany() companyId: string,
    @Body() dto: BulkModerateDto,
  ) {
    return this.jobModerationService.bulkModerate(adminId, companyId, dto);
  }
}
