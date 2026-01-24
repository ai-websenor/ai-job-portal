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
  async create(@CurrentUser('sub') userId: string, @Body() dto: CreateSavedSearchDto) {
    const savedSearch = await this.savedSearchService.create(userId, dto);
    return { message: 'Search saved successfully', data: savedSearch };
  }

  @Get()
  @ApiOperation({ summary: 'Get saved searches' })
  @ApiResponse({ status: 200, description: 'Saved searches retrieved' })
  async findAll(@CurrentUser('sub') userId: string, @Query() query: SavedSearchQueryDto) {
    const savedSearches = await this.savedSearchService.findAll(userId, query);
    return { message: 'Saved searches fetched successfully', data: savedSearches };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get saved search by ID' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search retrieved' })
  async findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const savedSearch = await this.savedSearchService.findOne(userId, id);
    return { message: 'Saved search fetched successfully', data: savedSearch };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search updated' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    const savedSearch = await this.savedSearchService.update(userId, id, dto);
    return { message: 'Saved search updated successfully', data: savedSearch };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search deleted' })
  async remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.savedSearchService.remove(userId, id);
    return { message: 'Saved search deleted successfully', data: {} };
  }

  @Put(':id/toggle-alerts')
  @ApiOperation({ summary: 'Toggle alerts for saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Alerts toggled' })
  async toggleAlerts(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const result = await this.savedSearchService.toggleAlerts(userId, id);
    return { message: 'Alerts toggled successfully', data: result };
  }
}
