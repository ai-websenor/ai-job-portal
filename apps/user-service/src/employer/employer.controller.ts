import { Controller, Get, Post, Put, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { EmployerService } from './employer.service';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { UpdateEmployerProfileDto } from './dto';

@ApiTags('employers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer')
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
  getProfile(@CurrentUser('sub') userId: string) {
    return this.employerService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update employer profile',
    description: 'Supports partial updates - only provided fields will be updated',
  })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateEmployerProfileDto) {
    return this.employerService.updateProfile(userId, dto);
  }

  @Post('profile/photo')
  @ApiOperation({ summary: 'Upload profile photo (JPEG, PNG, WebP, max 2MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
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
}
