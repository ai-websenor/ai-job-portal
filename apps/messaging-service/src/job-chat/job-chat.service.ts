import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { Database, jobs, companies } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { JobChatMessageDto, JobChatResponseDto } from './dto';
import { buildFallbackAnswer, FallbackJob } from './job-chat.fallback';

/** Wire shape of the AI engine's `POST /chat` response (snake_case). */
interface AiChatResponse {
  response: string;
  messages?: string[];
  suggestions?: string[];
  session_id?: string;
  degraded?: boolean;
}

@Injectable()
export class JobChatService {
  private readonly logger = new Logger(JobChatService.name);
  private readonly httpClient: AxiosInstance;
  private readonly aiServiceUrl: string;

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {
    this.aiServiceUrl =
      process.env.JOB_CHAT_AI_SERVICE_URL ||
      'http://ai-job-portal-dev-alb-1152570158.ap-south-1.elb.amazonaws.com/ai';

    this.httpClient = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async chat(dto: JobChatMessageDto, userId?: string): Promise<JobChatResponseDto> {
    // The AI engine keys conversation history off session_id. This used to be
    // omitted entirely, so the engine fell back to `chat-<jobId>-anon` and every
    // signed-out visitor to the same job appended to one shared history — each
    // person's questions became the next person's context.
    const sessionId = this.resolveSessionId(dto, userId);

    try {
      const payload: Record<string, string> = {
        job_id: dto.jobId,
        message: dto.message,
        session_id: sessionId,
      };

      if (userId) {
        payload.user_id = userId;
      }

      this.logger.log(
        `Job chat request for job ${dto.jobId}${userId ? ` by user ${userId}` : ' (anonymous)'} [session ${sessionId}]`,
      );

      const response = await this.httpClient.post<AiChatResponse>(
        `${this.aiServiceUrl}/chat`,
        payload,
      );

      return {
        response: response.data.response,
        messages: response.data.messages?.length
          ? response.data.messages
          : [response.data.response],
        suggestions: response.data.suggestions || [],
        sessionId: response.data.session_id || sessionId,
        degraded: response.data.degraded ?? false,
      };
    } catch (error) {
      // A malformed request is the caller's problem and must stay a 4xx —
      // degrading it would hide a real integration bug behind a friendly reply.
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        this.logger.warn(`AI service validation error: ${JSON.stringify(error.response.data)}`);
        throw new BadRequestException(
          error.response.data?.message || 'Invalid request to AI service',
        );
      }

      // Everything else is an outage on our side. The candidate gets an answer
      // built from the job row rather than a dead chat window.
      const reason = axios.isAxiosError(error)
        ? `status ${error.response?.status ?? 'no response'}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
      this.logger.error(`AI service unavailable for job ${dto.jobId} (${reason}) — using fallback`);

      return this.answerFromListing(dto, sessionId);
    }
  }

  /**
   * Degraded reply built from the job row this service can read directly.
   *
   * Reached only when the AI engine is unreachable. If the database is down too
   * there is genuinely nothing to say, so `buildFallbackAnswer` handles a null
   * job with an honest apology rather than this method throwing.
   */
  private async answerFromListing(
    dto: JobChatMessageDto,
    sessionId: string,
  ): Promise<JobChatResponseDto> {
    const job = await this.loadJobFacts(dto.jobId);
    const { response, suggestions } = buildFallbackAnswer(job, dto.message);

    return {
      response,
      messages: [response],
      suggestions,
      sessionId,
      degraded: true,
    };
  }

  private async loadJobFacts(jobId: string): Promise<FallbackJob | null> {
    try {
      const [row] = await this.db
        .select({
          title: jobs.title,
          location: jobs.location,
          city: jobs.city,
          state: jobs.state,
          country: jobs.country,
          jobType: jobs.jobType,
          workMode: jobs.workMode,
          experienceLevel: jobs.experienceLevel,
          experienceMin: jobs.experienceMin,
          experienceMax: jobs.experienceMax,
          salaryMin: jobs.salaryMin,
          salaryMax: jobs.salaryMax,
          showSalary: jobs.showSalary,
          payRate: jobs.payRate,
          skills: jobs.skills,
          qualification: jobs.qualification,
          certification: jobs.certification,
          benefits: jobs.benefits,
          travelRequirements: jobs.travelRequirements,
          deadline: jobs.deadline,
          isActive: jobs.isActive,
          status: jobs.status,
          companyName: companies.name,
          industry: companies.industry,
          companySize: companies.companySize,
        })
        .from(jobs)
        .leftJoin(companies, eq(jobs.companyId, companies.id))
        .where(eq(jobs.id, jobId))
        .limit(1);

      return (row as FallbackJob) ?? null;
    } catch (error) {
      this.logger.error(
        `Fallback job lookup failed for ${jobId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return null;
    }
  }

  /**
   * Decide which conversation this message belongs to.
   *
   * A client-supplied `sessionId` always wins — the browser owns the lifetime of
   * a chat window. A signed-in user without one gets a stable per-job thread so
   * their conversation survives a page reload. Anyone else gets a fresh key,
   * because the alternative is sharing a conversation with strangers.
   */
  private resolveSessionId(dto: JobChatMessageDto, userId?: string): string {
    if (dto.sessionId) {
      return dto.sessionId;
    }
    if (userId) {
      return `job-${dto.jobId}-${userId}`;
    }
    return `job-${dto.jobId}-anon-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
}
