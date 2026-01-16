import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreatePageDto, UpdatePageDto, CreateFaqDto, CreateEmailTemplateDto } from './dto';

@ApiTags('content')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Pages
  @Get('pages')
  @ApiOperation({ summary: 'List all CMS pages' })
  async listPages() {
    return this.contentService.listPages();
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get page by ID' })
  async getPage(@Param('id') id: string) {
    return this.contentService.getPage(id);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Create CMS page' })
  async createPage(@Body() dto: CreatePageDto) {
    return this.contentService.createPage(dto);
  }

  @Put('pages/:id')
  @ApiOperation({ summary: 'Update CMS page' })
  async updatePage(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.contentService.updatePage(id, dto);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Delete CMS page' })
  async deletePage(@Param('id') id: string) {
    return this.contentService.deletePage(id);
  }

  // FAQs
  @Get('faqs')
  @ApiOperation({ summary: 'List all FAQs' })
  async listFaqs() {
    return this.contentService.listFaqs();
  }

  @Post('faqs')
  @ApiOperation({ summary: 'Create FAQ' })
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.contentService.createFaq(dto);
  }

  @Put('faqs/:id')
  @ApiOperation({ summary: 'Update FAQ' })
  async updateFaq(@Param('id') id: string, @Body() dto: Partial<CreateFaqDto>) {
    return this.contentService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @ApiOperation({ summary: 'Delete FAQ' })
  async deleteFaq(@Param('id') id: string) {
    return this.contentService.deleteFaq(id);
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
