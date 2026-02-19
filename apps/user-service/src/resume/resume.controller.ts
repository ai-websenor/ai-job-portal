import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { ResumeService } from './resume.service';
import { CurrentUser } from '@ai-job-portal/common';

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload resume (PDF, DOC, DOCX, max 10MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  async uploadResume(@CurrentUser('sub') userId: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_RESUME_TYPES.includes(data.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, DOCX allowed');
    }

    const buffer = await data.toBuffer();
    if (buffer.length > MAX_RESUME_SIZE) {
      throw new BadRequestException('File too large. Max 10MB allowed');
    }

    const resume = await this.resumeService.uploadResume(userId, {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });
    return { message: 'Resume uploaded successfully', data: resume };
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes' })
  async getResumes(@CurrentUser('sub') userId: string) {
    const resumes = await this.resumeService.getResumes(userId);
    return { message: 'Resumes fetched successfully', data: resumes };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resume' })
  deleteResume(@CurrentUser('sub') userId: string, @Param('id') resumeId: string) {
    return this.resumeService.deleteResume(userId, resumeId);
  }

  @Post(':id/primary')
  @ApiOperation({ summary: 'Set as primary resume' })
  setPrimaryResume(@CurrentUser('sub') userId: string, @Param('id') resumeId: string) {
    return this.resumeService.setPrimaryResume(userId, resumeId);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get pre-signed download URL for resume (valid for 1 hour)' })
  async getDownloadUrl(@CurrentUser('sub') userId: string, @Param('id') resumeId: string) {
    const result = await this.resumeService.getResumeDownloadUrl(userId, resumeId);
    return { message: 'Download URL generated', data: result };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all available resume templates' })
  async getTemplates() {
    const templates = await this.resumeService.getAvailableTemplates();
    return { message: 'Templates fetched successfully', data: templates };
  }

  @Post('generate-from-template')
  @ApiOperation({ summary: 'Generate PDF resume from template' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['templateId', 'resumeData'],
      properties: {
        templateId: { type: 'string', description: 'Resume template ID' },
        resumeData: {
          type: 'object',
          description: 'Structured resume data to fill the template',
          properties: {
            personalDetails: { type: 'object' },
            educationalDetails: { type: 'array' },
            experienceDetails: { type: 'array' },
            skills: { type: 'object' },
          },
        },
      },
    },
  })
  async generateFromTemplate(
    @CurrentUser('sub') userId: string,
    @Body() body: { templateId: string; resumeData: any },
  ) {
    const result = await this.resumeService.generatePdfFromTemplate(
      userId,
      body.templateId,
      body.resumeData,
    );
    return { message: 'Resume generated successfully', data: result };
  }
}
