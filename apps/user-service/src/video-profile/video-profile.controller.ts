import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { CurrentUser } from '@ai-job-portal/common';
import { VideoProfileService } from './video-profile.service';

class PresignVideoUploadDto {
  @ApiProperty({ example: 'intro_video.mp4', description: 'Original video file name (.mp4)' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'video/mp4', description: 'Only video/mp4 is supported' })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ example: 52428800, description: 'File size in bytes (max 235929600)' })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ example: 60, description: 'Video duration in seconds (30 to 120)' })
  @IsNumber()
  @Min(30)
  @Max(120)
  durationSeconds: number;
}

class ConfirmVideoUploadDto {
  @ApiProperty({
    example: 'video-profiles/1739681234567-ab12cd.mp4',
    description: 'S3 object key returned from presign-upload',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'intro_video.mp4', description: 'Original video file name (.mp4)' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 60, description: 'Video duration in seconds (30 to 120)' })
  @IsNumber()
  @Min(30)
  @Max(120)
  durationSeconds: number;
}

@ApiTags('video-profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates')
export class VideoProfileController {
  constructor(private readonly videoProfileService: VideoProfileService) {}

  @Post('profile/video/presign-upload')
  @ApiOperation({ summary: 'Get presigned S3 URL for video upload (MP4, 30s-2min, max 225MB)' })
  @ApiBody({
    type: PresignVideoUploadDto,
    schema: {
      example: {
        fileName: 'intro_video.mp4',
        contentType: 'video/mp4',
        fileSize: 52428800,
        durationSeconds: 60,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned upload URL generated',
    schema: {
      example: {
        message: 'Presigned upload URL generated',
        data: {
          uploadUrl:
            'https://your-bucket.s3.us-east-1.amazonaws.com/video-profiles/1739681234567-ab12cd.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...',
          key: 'video-profiles/1739681234567-ab12cd.mp4',
          expiresIn: 600,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation or business rule error (invalid type/extension, too large, duration out of range)',
    schema: {
      examples: {
        invalidType: {
          summary: 'Invalid file type',
          value: {
            statusCode: 400,
            message: 'Invalid file type. Only MP4 format is allowed',
            error: 'Bad Request',
          },
        },
        invalidExtension: {
          summary: 'Invalid extension',
          value: {
            statusCode: 400,
            message: 'Invalid file extension. Only .mp4 files are allowed',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async getPresignedVideoUploadUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: PresignVideoUploadDto,
  ) {
    const data = await this.videoProfileService.getPresignedUploadUrl(
      userId,
      dto.fileName,
      dto.contentType,
      dto.fileSize,
      dto.durationSeconds,
    );
    console.log('Presigned upload URL generated-data>>', data);
    return { message: 'Presigned upload URL generated', data };
  }

  @Post('profile/video/confirm-upload')
  @ApiOperation({ summary: 'Confirm presigned video upload (verifies in S3, saves to profile)' })
  @ApiBody({
    type: ConfirmVideoUploadDto,
    schema: {
      example: {
        key: 'video-profiles/1739681234567-ab12cd.mp4',
        fileName: 'intro_video.mp4',
        durationSeconds: 60,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video confirmed, pending approval',
    schema: {
      example: {
        message: 'Video uploaded successfully. Pending admin approval.',
        data: {
          videoStatus: 'pending',
          rejectionReason: null,
          videoUploadedAt: '2026-02-16T10:15:30.000Z',
          durationSeconds: 60,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid key, missing S3 object, oversized file, or invalid duration',
    schema: {
      examples: {
        invalidPrefix: {
          summary: 'Invalid key prefix',
          value: {
            statusCode: 400,
            message: 'Invalid S3 key prefix',
            error: 'Bad Request',
          },
        },
        fileMissingInS3: {
          summary: 'Upload missing or URL expired',
          value: {
            statusCode: 400,
            message: 'File not found in S3. Upload may have failed or expired.',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async confirmVideoUpload(@CurrentUser('sub') userId: string, @Body() dto: ConfirmVideoUploadDto) {
    return this.videoProfileService.confirmVideoUpload(
      userId,
      dto.key,
      dto.fileName,
      dto.durationSeconds,
    );
  }

  @Post('profile/video')
  @ApiOperation({
    summary:
      '[DEPRECATED] Upload or record video profile (MP4 only, 30s-2min, max 225MB). Use presign-upload + confirm-upload instead.',
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
    summary:
      '[DEPRECATED] Replace existing video profile. Use presign-upload + confirm-upload instead.',
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
