import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto, BlogQueryDto } from './dto';

// Admin blog management controller
@ApiTags('admin-blog')
@ApiBearerAuth()
@Controller('admin/blog')
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @ApiOperation({ summary: 'Create blog post' })
  async create(@Body() dto: CreateBlogPostDto) {
    // TODO: Get authorId from JWT token
    const authorId = 'admin-placeholder';
    return this.blogService.create(authorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all blog posts (admin view)' })
  async findAll(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(query, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blog post by ID (admin view)' })
  @ApiParam({ name: 'id', description: 'Blog post ID or slug' })
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id, true);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  async remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}

// Public blog endpoints (read-only)
@ApiTags('blog')
@Controller('blog')
export class PublicBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List published blog posts' })
  async findAll(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(query, false);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get blog categories' })
  async getCategories() {
    return this.blogService.getCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  async findOne(@Param('slug') slug: string) {
    return this.blogService.findOne(slug, false);
  }
}
