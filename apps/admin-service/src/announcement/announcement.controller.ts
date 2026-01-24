import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, TargetAudience } from './dto';

// Admin announcement management
@ApiTags('admin-announcements')
@ApiBearerAuth()
@Controller('admin/announcements')
export class AdminAnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @ApiOperation({ summary: 'Create announcement' })
  async create(@Body() dto: CreateAnnouncementDto) {
    // TODO: Get adminId from JWT token
    const createdBy = 'admin-placeholder';
    return this.announcementService.create(createdBy, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all announcements (admin view)' })
  async findAll() {
    return this.announcementService.findAll(true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  async findOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update announcement' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiParam({ name: 'id', description: 'Announcement ID' })
  async remove(@Param('id') id: string) {
    return this.announcementService.remove(id);
  }
}

// Public announcement endpoints
@ApiTags('announcements')
@Controller('announcements')
export class PublicAnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: 'Get active announcements' })
  @ApiQuery({ name: 'audience', enum: TargetAudience, required: false })
  async getActive(@Query('audience') audience?: TargetAudience) {
    if (audience) {
      return this.announcementService.getActiveForAudience(audience);
    }
    return this.announcementService.findAll(false);
  }
}
