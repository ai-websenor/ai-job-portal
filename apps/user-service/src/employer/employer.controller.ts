import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { EmployerService } from './employer.service';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { UpdateEmployerProfileDto } from './dto';
import {
  AvatarListQueryDto,
  ProfilePhotoUploadUrlDto,
  ProfilePhotoConfirmDto,
} from '../candidate/dto';

@ApiTags('employers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('employers')
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Create employer profile' })
  createProfile(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.employerService.createProfile(userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get employer profile with company and subscription details' })
  async getProfile(@CurrentUser('sub') userId: string) {
    const profile = await this.employerService.getProfile(userId);
    return { message: 'Profile fetched successfuly', data: profile };
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update employer profile',
    description: 'Supports partial updates - only provided fields will be updated',
  })
  async updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateEmployerProfileDto) {
    const result = await this.employerService.updateProfile(userId, dto);
    return { message: 'Profile updated successfuly', data: result };
  }

  @Post('profile/photo')
  @ApiOperation({ summary: 'Upload profile photo (JPEG, PNG, WebP, max 2MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded' })
  async uploadProfilePhoto(@CurrentUser('sub') userId: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.employerService.updateProfilePhoto(userId, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });
  }

  @Post('profile/photo/upload-url')
  @ApiOperation({
    summary: 'Get pre-signed URL for profile photo upload (JPEG, PNG, WebP)',
    description: `Returns a pre-signed S3 PUT URL for direct client-side upload of the profile photo.
This endpoint works for both **initial upload** and **re-upload/update**.

**Allowed file types:** JPEG, PNG, WebP

**Flow:**
1. Call this endpoint with \`fileName\` and \`contentType\`
2. Upload the file directly to S3 using the returned \`uploadUrl\` (PUT request with file as body, set \`Content-Type\` header to the same contentType)
3. Call \`POST /api/v1/employers/profile/photo/confirm\` with the returned \`key\` to finalize

**Example:**
\`\`\`
// Step 1: Get upload URL
POST /api/v1/employers/profile/photo/upload-url
Body: { "fileName": "my-photo.jpg", "contentType": "image/jpeg" }
Response: { "uploadUrl": "https://s3...", "key": "profile-photos/1708500000-abc123.jpg", "expiresIn": 3600 }

// Step 2: Upload file directly to S3
PUT <uploadUrl>
Headers: Content-Type: image/jpeg
Body: <file binary>

// Step 3: Confirm upload
POST /api/v1/employers/profile/photo/confirm
Body: { "key": "profile-photos/1708500000-abc123.jpg" }
\`\`\``,
  })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed upload URL generated',
    schema: {
      example: {
        uploadUrl:
          'https://s3.ap-south-1.amazonaws.com/bucket/profile-photos/1708500000-abc123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...',
        key: 'profile-photos/1708500000-abc123.jpg',
        expiresIn: 3600,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid content type' })
  @ApiResponse({ status: 404, description: 'Employer profile not found' })
  async getProfilePhotoUploadUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: ProfilePhotoUploadUrlDto,
  ) {
    return this.employerService.generateProfilePhotoUploadUrl(
      userId,
      dto.fileName,
      dto.contentType,
    );
  }

  @Post('profile/photo/confirm')
  @ApiOperation({
    summary: 'Confirm profile photo upload after uploading to S3',
    description: `After uploading the file to S3 using the pre-signed URL from \`/upload-url\`, call this endpoint to confirm the upload and update the profile photo.
The server verifies the file exists in S3 before updating the record. If a profile photo already exists, the old file is automatically deleted from S3.

**Example:**
\`\`\`
POST /api/v1/employers/profile/photo/confirm
Body: { "key": "profile-photos/1708500000-abc123.jpg" }
Response: { "message": "Profile photo updated successfully", "data": { "profilePhoto": "https://s3...?X-Amz-Signature=..." } }
\`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Profile photo confirmed and saved',
    schema: {
      example: {
        message: 'Profile photo updated successfully',
        data: {
          profilePhoto:
            'https://s3.ap-south-1.amazonaws.com/bucket/profile-photos/1708500000-abc123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Photo not found in storage or invalid key' })
  @ApiResponse({ status: 404, description: 'Employer profile not found' })
  async confirmProfilePhotoUpload(
    @CurrentUser('sub') userId: string,
    @Body() dto: ProfilePhotoConfirmDto,
  ) {
    return this.employerService.confirmProfilePhotoUpload(userId, dto.key);
  }

  // Avatar Management
  @Get('avatars')
  @ApiOperation({ summary: 'List available avatars for selection' })
  @ApiResponse({ status: 200, description: 'Active avatars retrieved successfully' })
  async listAvatars(@Query() query: AvatarListQueryDto) {
    return this.employerService.listAvatars(query);
  }

  @Post('profile/avatar')
  @ApiOperation({ summary: 'Select avatar from available avatars' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatarId: { type: 'string', description: 'Avatar ID to select' },
      },
      required: ['avatarId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar selected successfully' })
  async selectAvatar(@CurrentUser('sub') userId: string, @Body('avatarId') avatarId: string) {
    return this.employerService.selectAvatar(userId, avatarId);
  }
}
