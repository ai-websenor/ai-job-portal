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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ResumeService } from './resume.service';
import { CurrentUser } from '@ai-job-portal/common';

class PresignResumeUploadDto {
  @ApiProperty({ example: 'John_Doe_Resume.pdf', description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    example: 'application/pdf',
    description:
      'Allowed: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ example: 245760, description: 'File size in bytes (max 10485760)' })
  @IsNumber()
  @Min(1)
  fileSize: number;
}

class ConfirmResumeUploadDto {
  @ApiProperty({ example: 'resumes/1739681234567-ab12cd.pdf', description: 'S3 object key' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'John_Doe_Resume.pdf', description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'application/pdf', description: 'Should match uploaded object type' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

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

  @Post('presign-upload')
  @ApiOperation({ summary: 'Get presigned S3 URL for resume upload (PDF/DOC/DOCX, max 10MB)' })
  @ApiBody({
    type: PresignResumeUploadDto,
    schema: {
      example: {
        fileName: 'John_Doe_Resume.pdf',
        contentType: 'application/pdf',
        fileSize: 245760,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned upload URL generated',
    schema: {
      example: {
        message: 'Presigned upload URL generated',
        data: {
          uploadUrl:
            'https://your-bucket.s3.us-east-1.amazonaws.com/resumes/1739681234567-ab12cd.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...',
          key: 'resumes/1739681234567-ab12cd.pdf',
          expiresIn: 300,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation or business rule error (invalid type, invalid size, or missing fields)',
    schema: {
      examples: {
        invalidType: {
          summary: 'Invalid file type',
          value: {
            statusCode: 400,
            message: 'Invalid file type. Only PDF, DOC, DOCX allowed',
            error: 'Bad Request',
          },
        },
        fileTooLarge: {
          summary: 'File too large',
          value: {
            statusCode: 400,
            message: 'File too large. Max 10MB allowed',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async getPresignedUploadUrl(
    @CurrentUser('sub') userId: string,
    @Body() dto: PresignResumeUploadDto,
  ) {
    const data = await this.resumeService.getPresignedUploadUrl(
      userId,
      dto.fileName,
      dto.contentType,
      dto.fileSize,
    );
    return { message: 'Presigned upload URL generated', data };
  }

  @Post('confirm-upload')
  @ApiOperation({
    summary: 'Confirm presigned resume upload (verifies in S3, saves to DB, triggers parsing)',
  })
  @ApiBody({
    type: ConfirmResumeUploadDto,
    schema: {
      example: {
        key: 'resumes/1739681234567-ab12cd.pdf',
        fileName: 'John_Doe_Resume.pdf',
        contentType: 'application/pdf',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Resume confirmed successfully',
    schema: {
      example: {
        message: 'Resume confirmed successfully',
        data: {
          resume: {
            id: '2b0df2d0-81f1-4e80-a478-d80c73cfd123',
            profileId: '3d2b3ff5-5adf-4e5a-a8f7-0d4440fb9abc',
            fileName: 'John_Doe_Resume.pdf',
            filePath: 'resumes/1739681234567-ab12cd.pdf',
            fileSize: 245760,
            fileType: 'pdf',
            isDefault: true,
          },
          structuredData: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid key/type, missing S3 object, or uploaded file exceeds limits',
    schema: {
      examples: {
        fileMissingInS3: {
          summary: 'Upload missing or URL expired',
          value: {
            statusCode: 400,
            message: 'File not found in S3. Upload may have failed or expired.',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async confirmUpload(@CurrentUser('sub') userId: string, @Body() dto: ConfirmResumeUploadDto) {
    console.log('confirm resume-route called>>', dto);
    const data = await this.resumeService.confirmUpload(
      userId,
      dto.key,
      dto.fileName,
      dto.contentType,
    );
    console.log('confirm resume-data>>', data);
    return { message: 'Resume confirmed successfully', data };
  }

  @Post('upload')
  @ApiOperation({
    summary:
      '[DEPRECATED] Upload resume via multipart. Use presign-upload + confirm-upload instead.',
  })
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
