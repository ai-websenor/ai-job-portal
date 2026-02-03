import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto } from './dto';

@ApiTags('company-media')
@Controller('companies/:companyId/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add company media' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Media added' })
  create(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(userId, companyId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get company media' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Media retrieved' })
  findAll(@Param('companyId') companyId: string) {
    return this.mediaService.findAll(companyId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Media ID' })
  @ApiResponse({ status: 200, description: 'Media retrieved' })
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.mediaService.findOne(companyId, id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update media' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Media ID' })
  @ApiResponse({ status: 200, description: 'Media updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.mediaService.update(userId, companyId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete media' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Media ID' })
  @ApiResponse({ status: 200, description: 'Media deleted' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.mediaService.remove(userId, companyId, id);
  }
}
