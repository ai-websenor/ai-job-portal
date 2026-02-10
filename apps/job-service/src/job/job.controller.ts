import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JobService } from './job.service';
import { CurrentUser, Public, Roles, RolesGuard } from '@ai-job-portal/common';
import { CreateJobDto, UpdateJobDto, UpdateJobStatusDto } from './dto';
import { SearchJobsDto } from '../search/dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  // ============================================
  // STATIC ROUTES - Must be declared BEFORE :id
  // ============================================

  @Get('employer/my-jobs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer jobs' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  async getEmployerJobs(@CurrentUser('sub') userId: string, @Query('active') active?: string) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    const jobs = await this.jobService.getEmployerJobs(userId, isActive);
    return { message: 'Employer jobs fetched successfully', data: jobs };
  }

  @Get('user/saved')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved jobs' })
  async getSavedJobs(@CurrentUser('sub') userId: string) {
    const savedJobs = await this.jobService.getSavedJobs(userId);
    return { message: 'Saved jobs fetched successfully', data: savedJobs };
  }

  @Get('recommended')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('candidate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized job recommendations for candidate' })
  @ApiResponse({ status: 200, description: 'Recommended jobs based on preferences and activity' })
  async getRecommendedJobs(@CurrentUser('sub') userId: string, @Query() dto: SearchJobsDto) {
    const result = await this.jobService.getRecommendedJobs(userId, dto);
    return { message: 'Recommended jobs fetched successfully', ...result };
  }

  // ============================================
  // CRUD ROUTES
  // ============================================

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new job posting' })
  @ApiResponse({ status: 201, description: 'Job created' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateJobDto) {
    const job = await this.jobService.create(userId, dto);
    return { message: 'Job created successfully', data: job };
  }

  // ============================================
  // DYNAMIC ROUTES - Must be declared AFTER static routes
  // ============================================

  @Get(':id')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async findById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || (req.headers['x-user-id'] as string | undefined);
    this.jobService.recordView(id, userId, req.ip);
    const job = await this.jobService.findById(id, userId);
    return { message: 'Job fetched successfully', data: job };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job posting' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    const job = await this.jobService.update(userId, id, dto);
    return { message: 'Job updated successfully', data: job };
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish job' })
  async publish(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.jobService.publish(userId, id);
    return { message: result.message, data: {} };
  }

  @Post(':id/close')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close job posting' })
  async close(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.jobService.close(userId, id);
    return { message: result.message, data: {} };
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job status (active, inactive, hold)' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateStatus(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    const result = await this.jobService.updateStatus(userId, id, dto.status);
    return { message: result.message, data: {} };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job' })
  async delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.jobService.delete(userId, id);
    return { message: result.message, data: {} };
  }

  @Post(':id/save')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save job' })
  async saveJob(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.jobService.saveJob(userId, id);
    return { message: result.message, data: {} };
  }

  @Delete(':id/save')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsave job' })
  async unsaveJob(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.jobService.unsaveJob(userId, id);
    return { message: result.message, data: {} };
  }
}
