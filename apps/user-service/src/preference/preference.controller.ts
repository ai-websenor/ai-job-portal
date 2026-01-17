import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { PreferenceService } from './preference.service';
import { CreateJobPreferenceDto, UpdateJobPreferenceDto, UserPreferenceDto } from './dto';

@ApiTags('preferences')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  // Job Preferences (candidate-specific)
  @Get('candidates/preferences')
  @ApiOperation({ summary: 'Get job preferences' })
  @ApiResponse({ status: 200, description: 'Job preferences retrieved' })
  getJobPreferences(@CurrentUser('sub') userId: string) {
    return this.preferenceService.getJobPreferences(userId);
  }

  @Put('candidates/preferences')
  @ApiOperation({ summary: 'Create or update job preferences' })
  @ApiResponse({ status: 200, description: 'Job preferences saved' })
  updateJobPreferences(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateJobPreferenceDto,
  ) {
    return this.preferenceService.createOrUpdateJobPreferences(userId, dto);
  }

  // User Preferences (app settings - all users)
  @Get('users/me/preferences')
  @ApiOperation({ summary: 'Get user preferences (app settings)' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved' })
  getUserPreferences(@CurrentUser('sub') userId: string) {
    return this.preferenceService.getUserPreferences(userId);
  }

  @Put('users/me/preferences')
  @ApiOperation({ summary: 'Update user preferences (app settings)' })
  @ApiResponse({ status: 200, description: 'User preferences updated' })
  updateUserPreferences(
    @CurrentUser('sub') userId: string,
    @Body() dto: UserPreferenceDto,
  ) {
    return this.preferenceService.updateUserPreferences(userId, dto);
  }
}
