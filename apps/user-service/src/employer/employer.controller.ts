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
import { AvatarListQueryDto } from '../candidate/dto';

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
