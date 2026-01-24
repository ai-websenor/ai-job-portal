import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto, SavedSearchQueryDto } from './dto';

@ApiTags('saved-searches')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me/saved-searches')
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Post()
  @ApiOperation({ summary: 'Save a search' })
  @ApiResponse({ status: 201, description: 'Search saved' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearchService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get saved searches' })
  @ApiResponse({ status: 200, description: 'Saved searches retrieved' })
  findAll(@CurrentUser('sub') userId: string, @Query() query: SavedSearchQueryDto) {
    return this.savedSearchService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get saved search by ID' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search retrieved' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.savedSearchService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.savedSearchService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search deleted' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.savedSearchService.remove(userId, id);
  }

  @Put(':id/toggle-alerts')
  @ApiOperation({ summary: 'Toggle alerts for saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Alerts toggled' })
  toggleAlerts(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.savedSearchService.toggleAlerts(userId, id);
  }
}
