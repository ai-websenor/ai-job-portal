import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { CreateBannerDto, UpdateBannerDto, BannerPosition, TargetAudience } from './dto';

// Admin banner management
@ApiTags('admin-banners')
@ApiBearerAuth()
@Controller('admin/banners')
export class AdminBannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @ApiOperation({ summary: 'Create banner' })
  async create(@Body() dto: CreateBannerDto) {
    // TODO: Get adminId from JWT token
    const createdBy = 'admin-placeholder';
    return this.bannerService.create(createdBy, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all banners (admin view)' })
  async findAll() {
    return this.bannerService.findAll(true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  async findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannerService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  async remove(@Param('id') id: string) {
    return this.bannerService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder banners in a position' })
  async reorder(
    @Body() body: { position: BannerPosition; bannerIds: string[] },
  ) {
    return this.bannerService.reorder(body.position, body.bannerIds);
  }
}

// Public banner endpoints
@ApiTags('banners')
@Controller('banners')
export class PublicBannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({ summary: 'Get active banners' })
  @ApiQuery({ name: 'position', enum: BannerPosition, required: false })
  @ApiQuery({ name: 'audience', enum: TargetAudience, required: false })
  async getActive(
    @Query('position') position?: BannerPosition,
    @Query('audience') audience?: TargetAudience,
  ) {
    if (position) {
      return this.bannerService.getByPosition(position, audience);
    }
    return this.bannerService.findAll(false);
  }
}
