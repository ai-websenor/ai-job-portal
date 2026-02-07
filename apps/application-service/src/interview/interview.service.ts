/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { eq, and, gte, desc } from 'drizzle-orm';
import {
  Database,
  interviews,
  interviewFeedback,
  jobApplications,
  applicationHistory,
  jobs,
  employers,
  profiles,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import {
  VideoConferencingFactory,
  MeetingDetails,
  MeetingCreateRequest,
} from '@ai-job-portal/video-conferencing';
import { DATABASE_CLIENT } from '../database/database.module';
import { ScheduleInterviewDto, UpdateInterviewDto } from './dto';
import { PaginationDto } from '@ai-job-portal/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    @Optional() private readonly videoConferencingFactory?: VideoConferencingFactory,
  ) {}

  async schedule(userId: string, dto: ScheduleInterviewDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, dto.applicationId),
      with: { job: true, jobSeeker: { with: { profile: true } } },
    })) as any;

    if (!application || application.job.employerId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    // Auto-generate meeting if tool is zoom or teams
    let meetingDetails: MeetingDetails | null = null;
    let meetingError: string | null = null;

    if (dto.interviewTool === 'zoom' || dto.interviewTool === 'teams') {
      try {
        meetingDetails = await this.createVideoMeeting(dto, application);
        this.logger.log(`Auto-generated ${dto.interviewTool} meeting: ${meetingDetails.meetingId}`);
      } catch (error: any) {
        this.logger.error(`Failed to create ${dto.interviewTool} meeting: ${error.message}`);
        meetingError = error.message;
        // Continue with interview creation without meeting link
      }
    }

    const [interview] = await this.db
      .insert(interviews)
      .values({
        applicationId: dto.applicationId,
        interviewType: dto.type as any,
        interviewMode: (dto.interviewMode || 'online') as any,
        interviewTool: dto.interviewTool as any,
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration || 60,
        location: dto.location,
        timezone: dto.timezone || 'Asia/Kolkata',
        meetingLink: meetingDetails?.meetingLink || dto.meetingLink,
        meetingPassword: meetingDetails?.password,
        hostJoinUrl: meetingDetails?.hostJoinUrl,
        zoomMeetingId: meetingDetails?.provider === 'zoom' ? meetingDetails.meetingId : null,
        teamsMeetingId: meetingDetails?.provider === 'teams' ? meetingDetails.meetingId : null,
        dialInInfo: meetingDetails?.dialInNumbers as any,
        meetingCreatedAt: meetingDetails ? new Date() : null,
        meetingError,
      })
      .returning();

    // Update application status
    const previousStatus = application.status;
    await this.db
      .update(jobApplications)
      .set({ status: 'interview_scheduled' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, dto.applicationId));

    // Add history entry for interview scheduled
    await this.db.insert(applicationHistory).values({
      applicationId: dto.applicationId,
      changedBy: userId,
      previousStatus: previousStatus as any,
      newStatus: 'interview_scheduled' as any,
      comment: `Interview scheduled: ${dto.type} round on ${new Date(dto.scheduledAt).toLocaleString()}`,
    });

    // Get candidate details for email
    const candidateName =
      application.jobSeeker?.profile?.firstName ||
      application.jobSeeker?.email?.split('@')[0] ||
      'Candidate';
    const candidateEmail = application.jobSeeker?.email || 'unknown@email.com';
    const companyName = application.job?.company?.name || 'Company';
    const toolName = dto.interviewTool
      ? dto.interviewTool.charAt(0).toUpperCase() + dto.interviewTool.slice(1)
      : 'Video';

    // Get employer details for notification
    const employerName = employer.firstName || 'Hiring Manager';
    const employerEmail = employer.email || 'unknown@company.com';

    // Log email content to console (for development/testing)
    // ============ CANDIDATE EMAIL ============
    this.logger.log('='.repeat(60));
    this.logger.log('📧 INTERVIEW SCHEDULED - CANDIDATE EMAIL NOTIFICATION');
    this.logger.log('='.repeat(60));
    this.logger.log(`To: ${candidateEmail}`);
    this.logger.log(`Subject: Interview Scheduled - ${application.job.title} at ${companyName}`);
    this.logger.log('-'.repeat(60));
    this.logger.log(`Hi ${candidateName},`);
    this.logger.log('');
    this.logger.log(
      `Your interview for "${application.job.title}" at "${companyName}" has been scheduled.`,
    );
    this.logger.log('');
    this.logger.log(`📅 Date & Time: ${new Date(dto.scheduledAt).toLocaleString()}`);
    this.logger.log(`⏱️  Duration: ${dto.duration || 60} minutes`);
    this.logger.log(`📍 Mode: ${dto.interviewMode || 'online'}`);
    this.logger.log(`🎯 Type: ${dto.type}`);
    if (interview.meetingLink) {
      this.logger.log('');
      this.logger.log(`💻 Meeting Platform: ${toolName}`);
      this.logger.log(`🔗 Join Link: ${interview.meetingLink}`);
      if (interview.meetingPassword) {
        this.logger.log(`🔐 Meeting Password: ${interview.meetingPassword}`);
      }
    }
    if (dto.location) {
      this.logger.log(`📍 Location: ${dto.location}`);
    }
    this.logger.log('');
    this.logger.log('Please join a few minutes before the scheduled time. Good luck!');
    this.logger.log('='.repeat(60));

    // ============ EMPLOYER EMAIL ============
    this.logger.log('');
    this.logger.log('='.repeat(60));
    this.logger.log('📧 INTERVIEW SCHEDULED - EMPLOYER EMAIL NOTIFICATION');
    this.logger.log('='.repeat(60));
    this.logger.log(`To: ${employerEmail}`);
    this.logger.log(
      `Subject: Interview Scheduled with ${candidateName} for ${application.job.title}`,
    );
    this.logger.log('-'.repeat(60));
    this.logger.log(`Hi ${employerName},`);
    this.logger.log('');
    this.logger.log(`An interview has been scheduled for the "${application.job.title}" position.`);
    this.logger.log('');
    this.logger.log('📋 INTERVIEW DETAILS:');
    this.logger.log(`   📅 Date & Time: ${new Date(dto.scheduledAt).toLocaleString()}`);
    this.logger.log(`   ⏱️  Duration: ${dto.duration || 60} minutes`);
    this.logger.log(`   📍 Mode: ${dto.interviewMode || 'online'}`);
    this.logger.log(`   🎯 Type: ${dto.type}`);
    this.logger.log(`   🌐 Timezone: ${dto.timezone || 'Asia/Kolkata'}`);
    if (interview.meetingLink) {
      this.logger.log('');
      this.logger.log('💻 MEETING DETAILS:');
      this.logger.log(`   Platform: ${toolName}`);
      this.logger.log(`   🔗 Join Link: ${interview.meetingLink}`);
      if (interview.hostJoinUrl) {
        this.logger.log(`   👔 Host Join Link: ${interview.hostJoinUrl}`);
      }
      if (interview.meetingPassword) {
        this.logger.log(`   🔐 Meeting Password: ${interview.meetingPassword}`);
      }
    }
    if (dto.location) {
      this.logger.log(`   📍 Location: ${dto.location}`);
    }
    this.logger.log('');
    this.logger.log('👤 CANDIDATE DETAILS:');
    this.logger.log(`   Name: ${candidateName}`);
    this.logger.log(`   Email: ${candidateEmail}`);
    if (application.jobSeeker?.profile?.phone) {
      this.logger.log(`   Phone: ${application.jobSeeker.profile.phone}`);
    }
    this.logger.log('');
    this.logger.log('💼 JOB DETAILS:');
    this.logger.log(`   Position: ${application.job.title}`);
    this.logger.log(`   Company: ${companyName}`);
    if (application.job.location) {
      this.logger.log(`   Job Location: ${application.job.location}`);
    }
    if (application.job.jobType) {
      this.logger.log(`   Job Type: ${application.job.jobType}`);
    }
    this.logger.log('');
    this.logger.log('Please be available a few minutes before the scheduled time.');
    this.logger.log('='.repeat(60));

    // Send notifications with meeting details (non-blocking)
    // Send candidate notification
    try {
      await this.sqsService.sendInterviewNotification({
        userId: application.jobSeekerId,
        interviewId: interview.id,
        jobTitle: application.job.title,
        scheduledAt: dto.scheduledAt,
        type: dto.type,
        meetingLink: interview.meetingLink || undefined,
        meetingPassword: interview.meetingPassword || undefined,
        interviewTool: dto.interviewTool,
      });
      this.logger.log('✅ SQS candidate notification sent successfully');
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to send SQS candidate notification: ${error.message}`);
      // Don't fail the interview creation
    }

    // Send employer notification
    try {
      await this.sqsService.sendEmployerInterviewNotification({
        employerId: employer.id,
        employerEmail,
        interviewId: interview.id,
        jobTitle: application.job.title,
        companyName,
        candidateName,
        candidateEmail,
        scheduledAt: dto.scheduledAt,
        duration: dto.duration || 60,
        type: dto.type,
        interviewMode: dto.interviewMode || 'online',
        interviewTool: dto.interviewTool,
        meetingLink: interview.meetingLink || undefined,
        meetingPassword: interview.meetingPassword || undefined,
        hostJoinUrl: interview.hostJoinUrl || undefined,
        location: dto.location,
        timezone: dto.timezone || 'Asia/Kolkata',
      });
      this.logger.log('✅ SQS employer notification sent successfully');
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to send SQS employer notification: ${error.message}`);
      // Don't fail the interview creation
    }

    return interview;
  }

  private async createVideoMeeting(
    dto: ScheduleInterviewDto,
    application: any,
  ): Promise<MeetingDetails> {
    if (!this.videoConferencingFactory) {
      throw new Error('Video conferencing not configured');
    }

    const provider = this.videoConferencingFactory.getProvider(
      dto.interviewTool as 'zoom' | 'teams',
    );

    const candidateName =
      application.jobSeeker?.profile?.firstName ||
      application.jobSeeker?.email?.split('@')[0] ||
      'Candidate';

    const meetingRequest: MeetingCreateRequest = {
      topic: `Interview: ${application.job.title} - ${candidateName}`,
      startTime: new Date(dto.scheduledAt),
      duration: dto.duration || 60,
      timezone: dto.timezone || 'Asia/Kolkata',
      agenda: `Interview for ${application.job.title} position`,
    };

    return provider.createMeeting(meetingRequest);
  }

  private async deleteVideoMeeting(interview: any): Promise<void> {
    if (!this.videoConferencingFactory) {
      return;
    }

    try {
      if (interview.zoomMeetingId) {
        const zoomService = this.videoConferencingFactory.getProvider('zoom');
        await zoomService.deleteMeeting(interview.zoomMeetingId);
        this.logger.log(`Deleted Zoom meeting: ${interview.zoomMeetingId}`);
      } else if (interview.teamsMeetingId) {
        const teamsService = this.videoConferencingFactory.getProvider('teams');
        await teamsService.deleteMeeting(interview.teamsMeetingId);
        this.logger.log(`Deleted Teams meeting: ${interview.teamsMeetingId}`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to delete video meeting: ${error.message}`);
      // Don't fail the cancel operation
    }
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
    if (dto.interviewMode !== undefined) updateData.interviewMode = dto.interviewMode;
    if (dto.interviewTool !== undefined) updateData.interviewTool = dto.interviewTool;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
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

    // Delete video meeting if exists
    await this.deleteVideoMeeting(interview);

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
