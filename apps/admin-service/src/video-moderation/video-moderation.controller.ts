import { Controller, Put, Get, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';
import { VideoModerationService } from './video-moderation.service';
import { UpdateVideoModerationDto } from './dto';

@ApiTags('video-moderation')
@Controller('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class VideoModerationController {
  constructor(private readonly videoModerationService: VideoModerationService) {}

  @Put('profile/:profileId/video/status')
  @RequirePermissions('MODERATE_CONTENT')
  @ApiOperation({ summary: 'Approve or reject a candidate video profile' })
  @ApiParam({ name: 'profileId', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Video status updated successfully' })
  @ApiResponse({ status: 400, description: 'Rejection reason required when rejecting' })
  @ApiResponse({ status: 404, description: 'Profile or video not found' })
  async updateVideoStatus(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateVideoModerationDto,
  ) {
    return this.videoModerationService.updateVideoStatus(
      profileId,
      dto.status,
      dto.rejectionReason,
    );
  }

  @Get('videos')
  @RequirePermissions('MODERATE_CONTENT')
  @ApiOperation({ summary: 'List all video profiles for moderation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or user ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
    description: 'Filter by moderation status',
  })
  @ApiResponse({ status: 200, description: 'Video profiles retrieved' })
  async listVideos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    return this.videoModerationService.listVideos(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      status,
    );
  }
}
