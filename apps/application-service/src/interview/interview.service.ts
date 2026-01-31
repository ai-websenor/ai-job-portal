/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, gte, desc } from 'drizzle-orm';
import {
  Database,
  interviews,
  interviewFeedback,
  jobApplications,
  jobs,
  employers,
  profiles,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { ScheduleInterviewDto, UpdateInterviewDto } from './dto';
import { PaginationDto } from '@ai-job-portal/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class InterviewService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
  ) {}

  async schedule(userId: string, dto: ScheduleInterviewDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, dto.applicationId),
      with: { job: true, jobSeeker: true },
    })) as any;

    if (!application || application.job.employerId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    const [interview] = await this.db
      .insert(interviews)
      .values({
        applicationId: dto.applicationId,
        interviewType: dto.type as any,
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration || 60,
        location: dto.location,
        meetingLink: dto.meetingLink,
      })
      .returning();

    // Update application status
    await this.db
      .update(jobApplications)
      .set({ status: 'interview_scheduled' as any })
      .where(eq(jobApplications.id, dto.applicationId));

    // Send notification
    await this.sqsService.sendInterviewNotification({
      userId: application.jobSeekerId,
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
          with: { job: true, jobSeeker: true },
        },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async update(userId: string, interviewId: string, dto: UpdateInterviewDto) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };
    if (dto.scheduledAt) updateData.scheduledAt = new Date(dto.scheduledAt);
    if (dto.type) updateData.interviewType = dto.type;
    if (dto.duration) updateData.duration = dto.duration;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.meetingLink !== undefined) updateData.meetingLink = dto.meetingLink;
    if (dto.status) updateData.status = dto.status;

    await this.db.update(interviews).set(updateData).where(eq(interviews.id, interviewId));

    return this.getById(interviewId);
  }

  async cancel(userId: string, interviewId: string, reason?: string) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(interviews)
      .set({ status: 'canceled' as any, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));

    return { message: 'Interview canceled' };
  }

  async complete(userId: string, interviewId: string, dto: { rating?: number; notes?: string }) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(interviews)
      .set({
        status: 'completed' as any,
        interviewerNotes: dto.notes,
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId));

    return { message: 'Interview completed' };
  }

  async getUpcoming(userId: string, role: string, query: PaginationDto) {
    const now = new Date();
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    if (role === 'employer') {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (!employer)
        return {
          data: [],
          pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };

      const data = await this.db.query.interviews.findMany({
        where: and(gte(interviews.scheduledAt, now), eq(interviews.status, 'scheduled')),
        with: {
          application: {
            with: { job: true, jobSeeker: true },
          },
        },
        orderBy: [interviews.scheduledAt],
        limit,
        offset,
      });

      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(interviews)
        .where(and(gte(interviews.scheduledAt, now), eq(interviews.status, 'scheduled')));
      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          totalInterviews: total,
          pageCount: totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
        },
      };
    } else {
      const candidate = await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
      });
      if (!candidate)
        return {
          data: [],
          pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };

      const data = await this.db.query.interviews.findMany({
        where: and(gte(interviews.scheduledAt, now), eq(interviews.status, 'scheduled')),
        with: {
          application: {
            with: { job: { with: { employer: true } } },
          },
        },
        orderBy: [interviews.scheduledAt],
        limit,
        offset,
      });

      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(interviews)
        .where(and(gte(interviews.scheduledAt, now), eq(interviews.status, 'scheduled')));
      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          totalInterviews: total,
          pageCount: totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
        },
      };
    }
  }

  async addInterviewerFeedback(
    userId: string,
    interviewId: string,
    dto: {
      rating: number;
      technicalSkills?: number;
      communication?: number;
      cultureFit?: number;
      notes?: string;
      recommendation?: string;
    },
  ) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.insert(interviewFeedback).values({
      interviewId,
      submittedBy: userId,
      overallRating: dto.rating,
      technicalRating: dto.technicalSkills,
      communicationRating: dto.communication,
      cultureFitRating: dto.cultureFit,
      notes: dto.notes,
      recommendation: dto.recommendation as any,
    });

    return { message: 'Feedback added' };
  }

  async submitFeedback(userId: string, interviewId: string, feedback: string) {
    // For candidates, we check jobSeekerId which references users.id directly
    const interview = (await this.getById(interviewId)) as any;

    if (interview.application.jobSeekerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(interviews)
      .set({ candidateFeedback: feedback, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));

    return { message: 'Feedback submitted' };
  }
}
