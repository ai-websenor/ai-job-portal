/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import { SavedSearchResponseDto } from './dto/saved-search-response.dto';
import { SavedSearchListResponseDto } from './dto/saved-search-list-response.dto';
import { SavedSearchDuplicateResponseDto } from './dto/saved-search-duplicate-response.dto';
import { SavedSearchUpdateResponseDto } from './dto/saved-search-update-response.dto';
import { SavedSearchDeleteResponseDto } from './dto/saved-search-delete-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';

@Controller('saved-searches')
@ApiTags('Saved Searches')
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Save a search for job alerts and recommendations',
    description:
      'Stores search intent (not results) for future job alerts. Prevents duplicates by comparing normalized search criteria.',
  })
  @ApiResponse({
    status: 201,
    description: 'Search saved successfully',
    type: SavedSearchResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Search already saved (duplicate found)',
    type: SavedSearchDuplicateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - empty search criteria',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - candidate role required',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - maximum saved searches limit reached',
  })
  create(@Body() dto: CreateSavedSearchDto, @Request() req) {
    return this.savedSearchService.create(dto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all saved searches for the authenticated candidate',
    description:
      'Returns only active saved searches, sorted by creation date (newest first). Does NOT execute searches.',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved searches retrieved successfully',
    type: SavedSearchListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - candidate role required',
  })
  findAll(@Request() req) {
    return this.savedSearchService.findAll(req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update alert settings for a saved search',
    description:
      'Only updates alert-related fields (alertEnabled, alertFrequency, alertChannels). Cannot modify search criteria.',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved search updated successfully',
    type: SavedSearchUpdateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or not a candidate',
  })
  @ApiResponse({
    status: 404,
    description: 'Saved search not found',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
    @Request() req,
  ) {
    return this.savedSearchService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a saved search',
    description:
      'Soft deletes the saved search (sets isActive = false). The record is preserved for analytics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved search deleted successfully',
    type: SavedSearchDeleteResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or not a candidate',
  })
  @ApiResponse({
    status: 404,
    description: 'Saved search not found',
  })
  remove(@Param('id') id: string, @Request() req) {
    return this.savedSearchService.remove(id, req.user);
  }
}
