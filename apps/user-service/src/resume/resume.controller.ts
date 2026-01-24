import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ResumeService } from './resume.service';
import { CurrentUser } from '@ai-job-portal/common';

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload resume' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async uploadResume(@CurrentUser('sub') userId: string) {
    // File handling would be done via Fastify multipart
    // This is a placeholder - actual implementation uses @fastify/multipart
    return { message: 'Use multipart form data to upload file' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes' })
  getResumes(@CurrentUser('sub') userId: string) {
    return this.resumeService.getResumes(userId);
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
}
