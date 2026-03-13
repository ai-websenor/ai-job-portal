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
  BadRequestException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { CandidateService } from './candidate.service';
import { CurrentUser } from '@ai-job-portal/common';
import {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
  AddExperienceDto,
  AddEducationDto,
  UpdateExperienceDto,
  UpdateEducationDto,
  ProfileViewQueryDto,
  SelectAvatarDto,
  AvatarListQueryDto,
  UpdateVisibilityDto,
  ProfilePhotoUploadUrlDto,
  ProfilePhotoConfirmDto,
} from './dto';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates')
export class CandidateController {
  private readonly logger = new CustomLogger();

  constructor(private readonly candidateService: CandidateService) {}

  // Profile
  @Post('profile')
  @ApiOperation({ summary: 'Create candidate profile' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  createProfile(@CurrentUser('sub') userId: string, @Body() dto: CreateCandidateProfileDto) {
    this.logger.info('Creating candidate profile', 'CandidateController', { userId });
    return this.candidateService.createProfile(userId, dto);
  }

  @Get('profile/completion')
  @ApiOperation({
    summary: 'Get profile completion details with remaining sections and missing fields',
  })
  @ApiResponse({ status: 200, description: 'Profile completion details retrieved' })
  async getProfileCompletion(@CurrentUser('sub') userId: string) {
    const result = await this.candidateService.getProfileCompletion(userId);
    return { message: 'Profile completion details fetched successfully', data: result };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get candidate profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@CurrentUser('sub') userId: string) {
    const result = await this.candidateService.getProfile(userId);
    return { message: 'Profile fetched successfully', data: result };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update candidate profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateCandidateProfileDto) {
    this.logger.info('Updating candidate profile', 'CandidateController', { userId });
    const result = await this.candidateService.updateProfile(userId, dto);
    this.logger.success('Candidate profile updated', 'CandidateController', { userId });
    return { message: 'Profile updated successfully', data: result };
  }

  @Patch('profile/visibility')
  @ApiOperation({ summary: 'Update profile visibility (public/private)' })
  @ApiResponse({ status: 200, description: 'Profile visibility updated' })
  async updateVisibility(@CurrentUser('sub') userId: string, @Body() dto: UpdateVisibilityDto) {
    return this.candidateService.updateVisibility(userId, dto.visibility);
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
    return this.candidateService.updateProfilePhoto(userId, {
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
3. Call \`POST /api/v1/candidates/profile/photo/confirm\` with the returned \`key\` to finalize

**Example:**
\`\`\`
// Step 1: Get upload URL
POST /api/v1/candidates/profile/photo/upload-url
Body: { "fileName": "my-photo.jpg", "contentType": "image/jpeg" }
Response: { "uploadUrl": "https://s3...", "key": "profile-photos/1708500000-abc123.jpg", "expiresIn": 3600 }

// Step 2: Upload file directly to S3
PUT <uploadUrl>
Headers: Content-Type: image/jpeg
Body: <file binary>

// Step 3: Confirm upload
POST /api/v1/candidates/profile/photo/confirm
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
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfilePhotoUploadUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: ProfilePhotoUploadUrlDto,
  ) {
    return this.candidateService.generateProfilePhotoUploadUrl(
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
POST /api/v1/candidates/profile/photo/confirm
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
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async confirmProfilePhotoUpload(
    @CurrentUser('sub') userId: string,
    @Body() dto: ProfilePhotoConfirmDto,
  ) {
    return this.candidateService.confirmProfilePhotoUpload(userId, dto.key);
  }

  // Avatar Management
  @Get('avatars')
  @ApiOperation({ summary: 'List available avatars for selection' })
  @ApiResponse({ status: 200, description: 'Active avatars retrieved successfully' })
  async listAvatars(@Query() query: AvatarListQueryDto) {
    return this.candidateService.listAvatars(query);
  }

  @Post('profile/avatar')
  @ApiOperation({ summary: 'Select avatar from available avatars' })
  @ApiBody({ type: SelectAvatarDto })
  @ApiResponse({ status: 200, description: 'Avatar selected successfully' })
  async selectAvatar(@CurrentUser('sub') userId: string, @Body('avatarId') avatarId: string) {
    return this.candidateService.selectAvatar(userId, avatarId);
  }

  // Work Experience
  @Post('experiences')
  @ApiOperation({ summary: 'Add work experience' })
  @ApiResponse({ status: 201, description: 'Experience added' })
  addExperience(@CurrentUser('sub') userId: string, @Body() dto: AddExperienceDto) {
    this.logger.info('Adding work experience', 'CandidateController', { userId });
    return this.candidateService.addExperience(userId, dto);
  }

  @Get('experiences')
  @ApiOperation({ summary: 'Get all work experiences' })
  @ApiResponse({ status: 200, description: 'Experiences retrieved' })
  getExperiences(@CurrentUser('sub') userId: string) {
    return this.candidateService.getExperiences(userId);
  }

  @Get('experiences/:id')
  @ApiOperation({ summary: 'Get work experience by ID' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience retrieved' })
  getExperience(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.candidateService.getExperience(userId, id);
  }

  @Put('experiences/:id')
  @ApiOperation({ summary: 'Update work experience' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience updated' })
  updateExperience(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    this.logger.info('Updating work experience', 'CandidateController', {
      userId,
      experienceId: id,
    });
    return this.candidateService.updateExperience(userId, id, dto);
  }

  @Delete('experiences/:id')
  @ApiOperation({ summary: 'Delete work experience' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience deleted' })
  removeExperience(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    this.logger.warn('Deleting work experience', 'CandidateController', {
      userId,
      experienceId: id,
    });
    return this.candidateService.removeExperience(userId, id);
  }

  // Education
  @Post('education')
  @ApiOperation({ summary: 'Add education' })
  @ApiResponse({ status: 201, description: 'Education added' })
  addEducation(@CurrentUser('sub') userId: string, @Body() dto: AddEducationDto) {
    this.logger.info('Adding education', 'CandidateController', { userId });
    return this.candidateService.addEducation(userId, dto);
  }

  @Get('education')
  @ApiOperation({ summary: 'Get all education records' })
  @ApiResponse({ status: 200, description: 'Education records retrieved' })
  getEducations(@CurrentUser('sub') userId: string) {
    return this.candidateService.getEducations(userId);
  }

  @Get('education/:id')
  @ApiOperation({ summary: 'Get education by ID' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education retrieved' })
  getEducation(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.candidateService.getEducation(userId, id);
  }

  @Put('education/:id')
  @ApiOperation({ summary: 'Update education' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education updated' })
  updateEducation(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    this.logger.info('Updating education', 'CandidateController', { userId, educationId: id });
    return this.candidateService.updateEducation(userId, id, dto);
  }

  @Delete('education/:id')
  @ApiOperation({ summary: 'Delete education' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education deleted' })
  removeEducation(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    this.logger.warn('Deleting education', 'CandidateController', { userId, educationId: id });
    return this.candidateService.removeEducation(userId, id);
  }

  // Profile Views
  @Get('profile-views')
  @ApiOperation({ summary: 'Get who viewed your profile' })
  @ApiResponse({ status: 200, description: 'Profile views retrieved' })
  getProfileViews(@CurrentUser('sub') userId: string, @Query() query: ProfileViewQueryDto) {
    return this.candidateService.getProfileViews(userId, query);
  }
}
