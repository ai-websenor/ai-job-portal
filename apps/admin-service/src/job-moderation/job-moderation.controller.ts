import { Controller, Get, Put, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobModerationService } from './job-moderation.service';
import { ListJobsForModerationDto, ModerateJobDto, FlagJobDto, BulkModerateDto } from './dto';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobModerationController {
  constructor(private readonly jobModerationService: JobModerationService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs for moderation' })
  async listJobs(@Query() dto: ListJobsForModerationDto) {
    return this.jobModerationService.listJobsForModeration(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get moderation statistics' })
  async getModerationStats() {
    return this.jobModerationService.getModerationStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details for moderation' })
  async getJob(@Param('id') id: string) {
    return this.jobModerationService.getJobForModeration(id);
  }

  @Put(':id/moderate')
  @ApiOperation({ summary: 'Approve or reject a job' })
  async moderateJob(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Body() dto: ModerateJobDto,
  ) {
    return this.jobModerationService.moderateJob(adminId, id, dto);
  }

  @Put(':id/flag')
  @ApiOperation({ summary: 'Flag a job for review' })
  async flagJob(
    @Headers('x-user-id') adminId: string,
    @Param('id') id: string,
    @Body() dto: FlagJobDto,
  ) {
    return this.jobModerationService.flagJob(adminId, id, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk approve/reject jobs' })
  async bulkModerate(
    @Headers('x-user-id') adminId: string,
    @Body() dto: BulkModerateDto,
  ) {
    return this.jobModerationService.bulkModerate(adminId, dto);
  }
}
