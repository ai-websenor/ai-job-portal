import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@ai-job-portal/common';
import { ContentService } from './content.service';
import { CreatePageDto, UpdatePageDto, CreateEmailTemplateDto } from './dto';

// Public endpoints for frontend/mobile (no auth required)
@ApiTags('pages')
@Controller('pages')
export class PublicContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get published page by slug (public)' })
  async getPublishedPage(@Param('slug') slug: string) {
    return this.contentService.getPublishedPageBySlug(slug);
  }
}

// Admin endpoints (auth required)
@ApiTags('content')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Pages
  @Get('pages')
  @ApiOperation({ summary: 'List all CMS pages' })
  async listPages() {
    return this.contentService.listPages();
  }

  @Get('pages/slug/:slug')
  @ApiOperation({ summary: 'Get page by slug' })
  async getPageBySlug(@Param('slug') slug: string) {
    return this.contentService.getPageBySlug(slug);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get page by ID' })
  async getPage(@Param('id') id: string) {
    return this.contentService.getPage(id);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Create CMS page' })
  async createPage(@CurrentUser('sub') userId: string, @Body() dto: CreatePageDto) {
    return this.contentService.createPage(userId, dto);
  }

  @Put('pages/:id')
  @ApiOperation({ summary: 'Update CMS page' })
  async updatePage(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.contentService.updatePage(id, userId, dto);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Delete CMS page' })
  async deletePage(@Param('id') id: string) {
    return this.contentService.deletePage(id);
  }

  // Email Templates
  @Get('email-templates')
  @ApiOperation({ summary: 'List email templates' })
  async listEmailTemplates() {
    return this.contentService.listEmailTemplates();
  }

  @Post('email-templates')
  @ApiOperation({ summary: 'Create email template' })
  async createEmailTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.contentService.createEmailTemplate(dto);
  }

  @Put('email-templates/:id')
  @ApiOperation({ summary: 'Update email template' })
  async updateEmailTemplate(@Param('id') id: string, @Body() dto: Partial<CreateEmailTemplateDto>) {
    return this.contentService.updateEmailTemplate(id, dto);
  }

  @Delete('email-templates/:id')
  @ApiOperation({ summary: 'Delete email template' })
  async deleteEmailTemplate(@Param('id') id: string) {
    return this.contentService.deleteEmailTemplate(id);
  }
}
