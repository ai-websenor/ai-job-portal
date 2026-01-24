import {
  Controller,
  Get,
  Post,
  Put,
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
import { CreateJobDto, UpdateJobDto } from './dto';
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
  getEmployerJobs(@CurrentUser('sub') userId: string, @Query('active') active?: string) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.jobService.getEmployerJobs(userId, isActive);
  }

  @Get('user/saved')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved jobs' })
  getSavedJobs(@CurrentUser('sub') userId: string) {
    return this.jobService.getSavedJobs(userId);
  }

  @Get('recommended')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('candidate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized job recommendations for candidate' })
  @ApiResponse({ status: 200, description: 'Recommended jobs based on preferences and activity' })
  getRecommendedJobs(@CurrentUser('sub') userId: string, @Query() dto: SearchJobsDto) {
    return this.jobService.getRecommendedJobs(userId, dto);
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
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateJobDto) {
    return this.jobService.create(userId, dto);
  }

  // ============================================
  // DYNAMIC ROUTES - Must be declared AFTER static routes
  // ============================================

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  findById(@Param('id') id: string, @Req() req: any) {
    this.jobService.recordView(id, req.user?.sub, req.ip);
    return this.jobService.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job posting' })
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobService.update(userId, id, dto);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish job' })
  publish(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.jobService.publish(userId, id);
  }

  @Post(':id/close')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close job posting' })
  close(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.jobService.close(userId, id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job' })
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.jobService.delete(userId, id);
  }

  @Post(':id/save')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save job' })
  saveJob(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.jobService.saveJob(userId, id);
  }

  @Delete(':id/save')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsave job' })
  unsaveJob(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.jobService.unsaveJob(userId, id);
  }
}
