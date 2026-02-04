import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CategoryService } from './category.service';
import { Public, RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories (tree structure)' })
  async findAll() {
    const categories = await this.categoryService.findAll();
    return { message: 'Categories fetched successfully', data: categories };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(@Param('id') id: string) {
    const category = await this.categoryService.findById(id);
    return { message: 'Category fetched successfully', data: category };
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  async findBySlug(@Param('slug') slug: string) {
    const category = await this.categoryService.findBySlug(slug);
    return { message: 'Category fetched successfully', data: category };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('MANAGE_SETTINGS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin)' })
  async create(@Body() dto: { name: string; description?: string; parentId?: string }) {
    const category = await this.categoryService.create(dto);
    return { message: 'Category created successfully', data: category };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('MANAGE_SETTINGS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin)' })
  async update(@Param('id') id: string, @Body() dto: any) {
    const category = await this.categoryService.update(id, dto);
    return { message: 'Category updated successfully', data: category };
  }
}
