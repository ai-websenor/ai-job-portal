import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard, Roles, CurrentUser } from '@ai-job-portal/common';
import { ModerationService } from './moderation.service';
import { ListModerationDto, CreateModerationFlagDto, ReviewModerationDto } from './dto';

@ApiTags('admin-moderation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin/moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('list')
  @ApiOperation({ summary: 'List flagged content for moderation' })
  async list(@Query() query: ListModerationDto) {
    return this.moderationService.list(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Moderation queue stats (pending count)' })
  async stats() {
    return this.moderationService.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flagged item by ID' })
  async findOne(@Param('id') id: string) {
    return this.moderationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Flag a piece of content for moderation' })
  async create(@Body() dto: CreateModerationFlagDto) {
    return this.moderationService.create(dto);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve flagged content (mark reviewed)' })
  async approve(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: ReviewModerationDto,
  ) {
    return this.moderationService.approve(id, adminId, dto);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject flagged content (mark rejected)' })
  async reject(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: ReviewModerationDto,
  ) {
    return this.moderationService.reject(id, adminId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a moderation flag' })
  async remove(@Param('id') id: string) {
    return this.moderationService.remove(id);
  }
}
