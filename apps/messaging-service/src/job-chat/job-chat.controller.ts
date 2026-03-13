import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, Public } from '@ai-job-portal/common';
import { JobChatService } from './job-chat.service';
import { JobChatMessageDto, JobChatResponseDto } from './dto';

@ApiTags('job-chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class JobChatController {
  constructor(private readonly jobChatService: JobChatService) {}

  @Post('job')
  @Public()
  @ApiOperation({
    summary: 'Chat about a job listing',
    description:
      'Candidate asks questions about a specific job listing. The AI chatbot answers based on job description, company details, salary, culture, and benefits. Authentication is optional — provide a JWT for personalized responses.',
  })
  @ApiResponse({ status: 201, description: 'AI chatbot response', type: JobChatResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Validation error (bad UUID, empty message, message > 2000 chars)',
  })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async chat(@CurrentUser('sub') userId: string | undefined, @Body() dto: JobChatMessageDto) {
    const result = await this.jobChatService.chat(dto, userId || undefined);
    return { message: 'Job chat response generated successfully', data: result };
  }
}
