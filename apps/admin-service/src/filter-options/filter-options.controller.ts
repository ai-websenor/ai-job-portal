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
  @ApiOperation({ summary: 'Get all filter options (optionally filter by group)' })
  @ApiQuery({ name: 'group', required: false, description: 'Filter by group name' })
  @ApiResponse({ status: 200, description: 'Returns filter options' })
  async getAll(@Query('group') group?: string) {
    const data = await this.filterOptionsService.getAll(group);
    return { message: 'Filter options fetched successfully', data };
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
}
