import { Controller, Get, Post, Put, Delete, Param, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from '@ai-job-portal/common';
import { VideoProfileService } from './video-profile.service';

@ApiTags('video-profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates')
export class VideoProfileController {
  constructor(private readonly videoProfileService: VideoProfileService) {}

  @Post('profile/video')
  @ApiOperation({
    summary: 'Upload or record video profile (MP4 only, 30s-2min, max 225MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully, pending approval' })
  @ApiResponse({ status: 400, description: 'Invalid file type, size, or duration' })
  async uploadVideo(@CurrentUser('sub') userId: string, @Req() req: FastifyRequest) {
    return this.videoProfileService.uploadVideo(userId, req);
  }

  @Put('profile/video')
  @ApiOperation({
    summary: 'Replace existing video profile (deletes old, uploads new, resets status)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Video replaced successfully, pending approval' })
  async updateVideo(@CurrentUser('sub') userId: string, @Req() req: FastifyRequest) {
    return this.videoProfileService.updateVideo(userId, req);
  }

  @Delete('profile/video')
  @ApiOperation({ summary: 'Delete video profile' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  async deleteVideo(@CurrentUser('sub') userId: string) {
    return this.videoProfileService.deleteVideo(userId);
  }

  @Get('profile/video/download')
  @ApiOperation({ summary: 'Get signed download URL for own video' })
  @ApiResponse({ status: 200, description: 'Signed URL returned' })
  async downloadVideo(@CurrentUser('sub') userId: string) {
    return this.videoProfileService.getDownloadUrl(userId);
  }

  @Get(':profileId/video')
  @ApiOperation({
    summary: 'View candidate video (employers see only approved, admins see all)',
  })
  @ApiParam({ name: 'profileId', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Video not available (pending/rejected or private)' })
  async viewCandidateVideo(
    @Param('profileId') profileId: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.videoProfileService.getVideoForViewer(profileId, user);
  }
}
