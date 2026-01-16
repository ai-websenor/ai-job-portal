import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, gte, desc } from 'drizzle-orm';
import {
  Database,
  interviews,
  applications,
  jobs,
  employerProfiles,
  candidateProfiles,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { ScheduleInterviewDto, UpdateInterviewDto } from './dto';

@Injectable()
export class InterviewService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
  ) {}

  async schedule(userId: string, dto: ScheduleInterviewDto) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = await this.db.query.applications.findFirst({
      where: eq(applications.id, dto.applicationId),
      with: { job: true, candidateProfile: true },
    }) as any;

    if (!application || application.job.employerProfileId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    const [interview] = await this.db.insert(interviews).values({
      applicationId: dto.applicationId,
      type: dto.type as any,
      scheduledAt: new Date(dto.scheduledAt),
      duration: dto.duration || 60,
      location: dto.location,
      meetingLink: dto.meetingLink,
      interviewerIds: dto.interviewerIds ? JSON.stringify(dto.interviewerIds) : null,
    }).returning();

    // Update application status
    await this.db.update(applications)
      .set({ status: 'interview' })
      .where(eq(applications.id, dto.applicationId));

    // Send notification
    await this.sqsService.sendInterviewNotification({
      userId: application.candidateProfile.userId,
      interviewId: interview.id,
      jobTitle: application.job.title,
      scheduledAt: dto.scheduledAt,
      type: dto.type,
    });

    return interview;
  }

  async getById(id: string) {
    const interview = await this.db.query.interviews.findFirst({
      where: eq(interviews.id, id),
      with: {
        application: {
          with: { job: true, candidateProfile: true },
        },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async update(userId: string, interviewId: string, dto: UpdateInterviewDto) {
    const interview = await this.getById(interviewId) as any;

    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });

    if (!employer || interview.application.job.employerProfileId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };
    if (dto.scheduledAt) updateData.scheduledAt = new Date(dto.scheduledAt);
    if (dto.type) updateData.type = dto.type;
    if (dto.duration) updateData.duration = dto.duration;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.meetingLink !== undefined) updateData.meetingLink = dto.meetingLink;
    if (dto.status) updateData.status = dto.status;

    await this.db.update(interviews)
      .set(updateData)
      .where(eq(interviews.id, interviewId));

    return this.getById(interviewId);
  }

  async cancel(userId: string, interviewId: string, reason?: string) {
    const interview = await this.getById(interviewId) as any;

    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });

    if (!employer || interview.application.job.employerProfileId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(interviews)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));

    return { message: 'Interview cancelled' };
  }

  async complete(userId: string, interviewId: string, dto: { rating?: number; notes?: string }) {
    const interview = await this.getById(interviewId) as any;

    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });

    if (!employer || interview.application.job.employerProfileId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(interviews)
      .set({
        status: 'completed',
        rating: dto.rating,
        interviewerNotes: dto.notes,
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId));

    return { message: 'Interview completed' };
  }

  async getUpcoming(userId: string, role: string) {
    const now = new Date();

    if (role === 'employer') {
      const employer = await this.db.query.employerProfiles.findFirst({
        where: eq(employerProfiles.userId, userId),
      });
      if (!employer) return [];

      return this.db.query.interviews.findMany({
        where: and(
          gte(interviews.scheduledAt, now),
          eq(interviews.status, 'scheduled'),
        ),
        with: {
          application: {
            with: { job: true, candidateProfile: true },
          },
        },
        orderBy: [interviews.scheduledAt],
      });
    } else {
      const candidate = await this.db.query.candidateProfiles.findFirst({
        where: eq(candidateProfiles.userId, userId),
      });
      if (!candidate) return [];

      return this.db.query.interviews.findMany({
        where: and(
          gte(interviews.scheduledAt, now),
          eq(interviews.status, 'scheduled'),
        ),
        with: {
          application: {
            with: { job: { with: { employerProfile: true } } },
          },
        },
        orderBy: [interviews.scheduledAt],
      });
    }
  }

  async submitFeedback(userId: string, interviewId: string, feedback: string) {
    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });
    if (!candidate) throw new ForbiddenException('Candidate profile required');

    const interview = await this.getById(interviewId) as any;

    if (interview.application.candidateProfileId !== candidate.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(interviews)
      .set({ candidateFeedback: feedback, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));

    return { message: 'Feedback submitted' };
  }
}
