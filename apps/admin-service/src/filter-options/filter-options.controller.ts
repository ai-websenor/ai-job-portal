import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '@ai-job-portal/common';
import { FilterOptionsService } from './filter-options.service';
import { CreateFilterOptionDto, UpdateFilterOptionDto } from './dto';

@ApiTags('Filter Options')
@Controller('admin/filter-options')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FilterOptionsController {
  constructor(private readonly filterOptionsService: FilterOptionsService) {}

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({
    summary: 'Get all filter options (optionally filter by group)',
    description:
      'For group=industry returns parent categories from job_categories. For group=department returns subcategories from job_categories. All other groups return from filter_options table.',
  })
  @ApiQuery({
    name: 'group',
    required: false,
    description: 'Filter by group name (e.g. industry, department, job_type)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Returns filter options with pagination' })
  async getAll(
    @Query('group') group?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.filterOptionsService.getAll(
      group,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return { message: 'Filter options fetched successfully', ...result };
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new filter option (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Filter option created' })
  @ApiResponse({ status: 409, description: 'Duplicate group+value' })
  async create(@Body() dto: CreateFilterOptionDto) {
    const data = await this.filterOptionsService.create(dto);
    return { message: 'Filter option created successfully', data };
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a filter option (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Filter option updated' })
  @ApiResponse({ status: 404, description: 'Filter option not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateFilterOptionDto) {
    const data = await this.filterOptionsService.update(id, dto);
    return { message: 'Filter option updated successfully', data };
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a filter option (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Filter option deleted' })
  @ApiResponse({ status: 404, description: 'Filter option not found' })
  async delete(@Param('id') id: string) {
    return this.filterOptionsService.delete(id);
  }

  @Post('seed')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Seed default filter options (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Default filter options seeded' })
  async seed() {
    return this.filterOptionsService.seed();
  }

  @Post('sync-categories')
  @Roles('super_admin')
  @ApiOperation({
    summary: 'Auto-activate top N industry/department categories by job count (super_admin only)',
    description:
      'Sets all job_categories to inactive, then activates the top N parent categories (industry) and top N subcategories (department) ranked by number of jobs. Defaults to top 5. Safe to re-run anytime.',
  })
  @ApiQuery({
    name: 'topN',
    required: false,
    description: 'How many to activate per group (default 5)',
    example: 5,
  })
  @ApiResponse({ status: 201, description: 'Top categories activated' })
  async syncTopCategories(@Query('topN') topN?: string) {
    return this.filterOptionsService.syncTopCategories(topN ? parseInt(topN, 10) : 5);
  }
}
