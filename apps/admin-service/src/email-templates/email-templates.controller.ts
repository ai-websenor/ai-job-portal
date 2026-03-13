import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { RolesGuard, Roles, CurrentUser } from '@ai-job-portal/common';
import { EmailTemplatesService } from './email-templates.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
  PreviewEmailTemplateDto,
} from './dto';

@ApiTags('Admin - Email Templates')
@ApiBearerAuth()
@Controller('admin/email-templates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(@Body() dto: CreateEmailTemplateDto, @CurrentUser() user: any) {
    const template = await this.emailTemplatesService.create(dto, user?.userId);
    return { message: 'Email template created successfully', data: template };
  }

  @Get()
  @ApiOperation({ summary: 'List all email templates' })
  @ApiResponse({ status: 200, description: 'Templates fetched successfully' })
  async findAll(@Query() query: EmailTemplateQueryDto) {
    const result = await this.emailTemplatesService.findAll(query);
    return { message: 'Email templates fetched successfully', ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiResponse({ status: 200, description: 'Template fetched successfully' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const template = await this.emailTemplatesService.findOne(id);
    return { message: 'Email template fetched successfully', data: template };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update email template content fields' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmailTemplateDto) {
    const template = await this.emailTemplatesService.update(id, dto);
    return { message: 'Email template updated successfully', data: template };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an email template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailTemplatesService.remove(id);
  }

  @Post(':id/banner')
  @ApiOperation({
    summary:
      'Upload banner image for email template (JPEG/PNG/WebP, max 2MB, recommended 600x200px, 3:1 ratio)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Banner image uploaded successfully' })
  async uploadBanner(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }
    return this.emailTemplatesService.uploadBanner(id, data);
  }

  @Delete(':id/banner')
  @ApiOperation({ summary: 'Delete banner image from email template' })
  @ApiResponse({ status: 200, description: 'Banner image deleted successfully' })
  async deleteBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailTemplatesService.deleteBanner(id);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview email template with sample data' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async preview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PreviewEmailTemplateDto) {
    const preview = await this.emailTemplatesService.preview(id, dto.sampleData);
    return { message: 'Preview generated successfully', data: preview };
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default email templates' })
  @ApiResponse({ status: 200, description: 'Templates seeded successfully' })
  async seed() {
    return this.emailTemplatesService.seedTemplates();
  }
}
