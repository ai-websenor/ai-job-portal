import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, interviews, interviewFeedback, employers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { InterviewLookupHelper } from './interview-lookup.helper';

@Injectable()
export class InterviewFeedbackService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly lookupHelper: InterviewLookupHelper,
  ) {}

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
    const interview = (await this.lookupHelper.getById(interviewId)) as any;

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
    const interview = (await this.lookupHelper.getById(interviewId)) as any;

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
