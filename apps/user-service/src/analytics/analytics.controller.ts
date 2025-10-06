import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get profile analytics summary' })
  @ApiResponse({ status: 200, description: 'Profile analytics data' })
  async getAnalytics(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.analyticsService.getProfileAnalytics(profile.id);
  }

  @Get('views')
  @ApiOperation({ summary: 'Get profile view history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results to return' })
  @ApiResponse({ status: 200, description: 'List of profile views' })
  async getViewHistory(
    @GetUser('id') userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.analyticsService.getProfileViewHistory(profile.id, limit || 50);
  }

  @Get('views/by-source')
  @ApiOperation({ summary: 'Get views grouped by source' })
  @ApiResponse({ status: 200, description: 'Views grouped by source' })
  async getViewsBySource(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.analyticsService.getViewsBySource(profile.id);
  }
}
