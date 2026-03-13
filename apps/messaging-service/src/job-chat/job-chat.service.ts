import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { JobChatMessageDto, JobChatResponseDto } from './dto';

@Injectable()
export class JobChatService {
  private readonly logger = new Logger(JobChatService.name);
  private readonly httpClient: AxiosInstance;
  private readonly aiServiceUrl: string;

  constructor() {
    this.aiServiceUrl =
      process.env.JOB_CHAT_AI_SERVICE_URL ||
      'http://ai-job-portal-dev-alb-1152570158.ap-south-1.elb.amazonaws.com/ai';

    this.httpClient = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async chat(dto: JobChatMessageDto, userId?: string): Promise<JobChatResponseDto> {
    try {
      const payload: Record<string, string> = {
        job_id: dto.jobId,
        message: dto.message,
      };

      if (userId) {
        payload.user_id = userId;
      }

      this.logger.log(
        `Job chat request for job ${dto.jobId}${userId ? ` by user ${userId}` : ' (anonymous)'}`,
      );

      const response = await this.httpClient.post<JobChatResponseDto>(
        `${this.aiServiceUrl}/chat`,
        payload,
      );

      return {
        response: response.data.response,
        messages: response.data.messages || [],
        suggestions: response.data.suggestions || [],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 422) {
          this.logger.warn(`AI service validation error: ${JSON.stringify(data)}`);
          throw new BadRequestException(data?.message || 'Invalid request to AI service');
        }

        if (status === 503 || !error.response) {
          this.logger.error(`AI service unavailable: ${error.message}`);
          throw new ServiceUnavailableException(
            'AI chatbot service is currently unavailable. Please try again later.',
          );
        }

        this.logger.error(`AI service error ${status}: ${error.message}`);
        throw new ServiceUnavailableException('AI chatbot service encountered an error');
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Job chat error: ${errorMessage}`);
      throw new ServiceUnavailableException('AI chatbot service encountered an error');
    }
  }
}
