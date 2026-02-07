import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';
import { ResumeTemplatesService } from './resume-templates.service';
import { CreateResumeTemplateDto, UpdateResumeTemplateDto, ResumeTemplateQueryDto } from './dto';

@ApiTags('resume-templates')
@Controller('resume-templates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ResumeTemplatesController {
  constructor(private readonly templatesService: ResumeTemplatesService) {}

  @Post()
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Create resume template (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Resume template created' })
  create(@Body() dto: CreateResumeTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Get()
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'List resume templates with filters (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Resume templates retrieved' })
  findAll(@Query() query: ResumeTemplateQueryDto) {
    return this.templatesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Get resume template by ID (super_admin only)' })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiResponse({ status: 200, description: 'Resume template retrieved' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Update resume template (super_admin only)' })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiResponse({ status: 200, description: 'Resume template updated' })
  update(@Param('id') id: string, @Body() dto: UpdateResumeTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Delete resume template (super_admin only)' })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiResponse({ status: 200, description: 'Resume template deleted' })
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post(':id/thumbnail')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({
    summary: 'Upload template thumbnail (JPEG, PNG, WebP, max 2MB) - super_admin only',
  })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'Thumbnail uploaded' })
  async uploadThumbnail(@Param('id') id: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.templatesService.uploadThumbnail(id, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });
  }

  @Patch(':id/status')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Toggle template active/inactive status (super_admin only)' })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiBody({ schema: { type: 'object', properties: { isActive: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'Template status updated' })
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.templatesService.updateStatus(id, isActive);
  }

  @Patch(':id/order')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Update template display order (super_admin only)' })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiBody({ schema: { type: 'object', properties: { displayOrder: { type: 'number' } } } })
  @ApiResponse({ status: 200, description: 'Template display order updated' })
  updateOrder(@Param('id') id: string, @Body('displayOrder') displayOrder: number) {
    return this.templatesService.updateOrder(id, displayOrder);
  }

  @Post(':id/preview')
  @RequirePermissions('MANAGE_RESUME_TEMPLATES')
  @ApiOperation({ summary: 'Preview template with sample data (returns HTML)' })
  @ApiParam({ name: 'id', description: 'Resume template ID' })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'Resume data to fill in the template',
    },
  })
  @ApiResponse({ status: 200, description: 'Rendered HTML' })
  async preview(@Param('id') id: string, @Body() data: any) {
    const template = await this.templatesService.findOne(id);

    // Simple placeholder replacement
    let html = template.templateHtml;

    // Replace placeholders with data
    const replaceDeep = (obj: any, prefix = '') => {
      for (const key in obj) {
        const placeholder = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (Array.isArray(value)) {
          // Handle arrays (like skills)
          const listItems = value
            .map((item) => (typeof item === 'string' ? `<li>${item}</li>` : JSON.stringify(item)))
            .join('\n');
          html = html.replace(new RegExp(`{{${placeholder}}}`, 'g'), listItems);
        } else if (typeof value === 'object' && value !== null) {
          replaceDeep(value, placeholder);
        } else {
          html = html.replace(new RegExp(`{{${placeholder}}}`, 'g'), value || '');
        }
      }
    };

    replaceDeep(data);

    // Add CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${template.templateCss || ''}</style>
      </head>
      <body>${html}</body>
      </html>
    `;

    return { html: fullHtml };
  }
}
