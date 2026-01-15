import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { ResumeTextService } from './resume-text.service';
import { ResumeAiService } from './resume-ai.service';
import { CustomLogger } from '@ai-job-portal/logger';

@ApiTags('resumes')
@Controller('resumes')
export class UploadController {
  private readonly logger = new CustomLogger();

  constructor(
    private readonly resumeTextService: ResumeTextService,
    private readonly resumeAiService: ResumeAiService,
  ) {}

  @Post('parse')
  @UseInterceptors(FastifyFileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Parse resume and return structured data' })
  @ApiResponse({ status: 201, description: 'Resume parsed successfully' })
  async parseResume(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    this.logger.info(
      `Parsing resume ${file.originalname} (${file.mimetype})...`,
      'UploadController',
    );

    // 1. Extract raw text
    const text = await this.resumeTextService.extractText(file.buffer, file.mimetype);

    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Could not extract text from the provided file');
    }

    // 2. Structure data using AI
    const structuredData = await this.resumeAiService.extractStructuredData(text);

    console.log('---------------- RESUME CONTENT START ----------------');
    console.log(JSON.stringify(structuredData, null, 2));
    console.log('---------------- RESUME CONTENT END ------------------');

    return {
      filename: file.originalname,
      contentType: file.mimetype,
      ...structuredData,
    };
  }
}
