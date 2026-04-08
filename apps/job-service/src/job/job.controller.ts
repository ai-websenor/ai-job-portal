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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JobService } from './job.service';
import {
  CurrentUser,
  Public,
  Roles,
  RolesGuard,
  RequirePermissions,
  PermissionsGuard,
} from '@ai-job-portal/common';
import { CreateJobDto, UpdateJobDto, UpdateJobStatusDto } from './dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  // ============================================
  // STATIC ROUTES - Must be declared BEFORE :id
  // ============================================

  @Get('employer/my-jobs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer jobs' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, example: true })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by job title (case-insensitive, partial match)',
    example: 'React Developer',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    type: String,
    description:
      'Set to "company" to view all company jobs (requires company-jobs:read permission)',
    example: 'company',
  })
  async getEmployerJobs(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
    @Query('scope') scope?: string,
  ) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    const jobs = await this.jobService.getEmployerJobs(userId, userRole, isActive, search, scope);
    return { message: 'Employer jobs fetched successfully', data: jobs };
  }

  @Get('user/saved')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved jobs' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by job title or company name (case-insensitive, partial match)',
    example: 'React Developer',
  })
  async getSavedJobs(@CurrentUser('sub') userId: string, @Query('search') search?: string) {
    const savedJobs = await this.jobService.getSavedJobs(userId, search);
    return { message: 'Saved jobs fetched successfully', data: savedJobs };
  }

  @Get('recommended')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('candidate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'DEPRECATED: Redirects to /api/v1/recommendations/jobs' })
  @ApiResponse({ status: 301, description: 'Redirect to AI-powered recommendations' })
  async getRecommendedJobs(@Req() req: any, @Res() res: any) {
    const query = req.url.split('?')[1];
    const redirectUrl = `/api/v1/recommendations/jobs${query ? `?${query}` : ''}`;
    return res.status(301).redirect(redirectUrl);
  }

  // ============================================
  // CRUD ROUTES
  // ============================================

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new job posting' })
  @ApiResponse({ status: 201, description: 'Job created' })
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateJobDto) {
    const job = await this.jobService.create(userId, dto);
    return { message: 'Job created successfully. Click "Publish Job" to make it live.', data: job };
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
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job posting' })
  async update(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    const job = await this.jobService.update(userId, id, dto, userRole);
    return { message: 'Job updated successfully', data: job };
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish job — checks subscription at publish time' })
  @ApiResponse({ status: 201, description: 'Job is live now' })
  @ApiResponse({ status: 403, description: 'Plan expired or job posting limit reached' })
  async publish(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
  ) {
    const result = await this.jobService.publish(userId, id, userRole);
    return { message: result.message, data: result.data ?? {} };
  }

  @Post(':id/close')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close job posting' })
  async close(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
  ) {
    const result = await this.jobService.close(userId, id, userRole);
    return { message: result.message, data: {} };
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
  @Roles('employer', 'super_employer')
  @RequirePermissions('jobs:update-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job status (active, inactive, hold)' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateStatus(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    const result = await this.jobService.updateStatus(userId, id, dto.status, userRole);
    return { message: result.message, data: {} };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job' })
  async delete(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') id: string,
  ) {
    const result = await this.jobService.delete(userId, id, userRole);
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
