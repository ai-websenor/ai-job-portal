import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
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
import { RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';
import { AvatarService } from './avatar.service';
import {
  UpdateAvatarDto,
  AvatarQueryDto,
  UpdateAvatarStatusDto,
  UpdateAvatarOrderDto,
} from './dto';

@ApiTags('avatars')
@Controller('avatars')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post()
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({ summary: 'Upload new avatar (JPEG, PNG, WebP, max 2MB) - super_admin only' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', description: 'Avatar name/label' },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          description: 'Gender category',
          default: 'other',
        },
      },
      required: ['file', 'name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
  async create(@Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    return this.avatarService.createFromUpload(data);
  }

  @Get()
  @ApiOperation({ summary: 'List all avatars (filter by activeOnly for users)' })
  @ApiResponse({ status: 200, description: 'Avatars retrieved successfully' })
  findAll(@Query() query: AvatarQueryDto) {
    return this.avatarService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({ summary: 'Get avatar by ID - super_admin only' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Avatar retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.avatarService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({ summary: 'Update avatar metadata - super_admin only' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateAvatarDto) {
    const result = await this.avatarService.update(id, dto);
    return { message: 'Avatar updated successfully', data: result };
  }

  @Patch(':id/status')
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({ summary: 'Toggle avatar active/inactive status - super_admin only' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiBody({ type: UpdateAvatarStatusDto })
  @ApiResponse({ status: 200, description: 'Avatar status updated successfully' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateAvatarStatusDto) {
    const result = await this.avatarService.updateStatus(id, dto.isActive);
    return { message: 'Avatar status updated successfully', data: result };
  }

  @Patch(':id/order')
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({ summary: 'Update avatar display order - super_admin only' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiBody({ type: UpdateAvatarOrderDto })
  @ApiResponse({ status: 200, description: 'Avatar order updated successfully' })
  async updateOrder(@Param('id') id: string, @Body() dto: UpdateAvatarOrderDto) {
    const result = await this.avatarService.updateOrder(id, dto.displayOrder);
    return { message: 'Avatar order updated successfully', data: result };
  }

  @Patch(':id/image')
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({ summary: 'Update avatar image - super_admin only' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar image updated successfully' })
  async updateImage(@Param('id') id: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    return this.avatarService.updateImage(id, data);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE_AVATARS')
  @ApiOperation({
    summary: 'Delete avatar (soft delete - marks as inactive) - super_admin only',
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Avatar deleted successfully' })
  delete(@Param('id') id: string) {
    return this.avatarService.delete(id);
  }
}
