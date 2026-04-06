/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, inArray, or, ilike } from 'drizzle-orm';
import {
  Database,
  interviews,
  interviewFeedback,
  jobApplications,
  applicationHistory,
  jobs,
  employers,
  profiles,
  companies,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import {
  VideoConferencingFactory,
  MeetingDetails,
  MeetingCreateRequest,
} from '@ai-job-portal/video-conferencing';
import { DATABASE_CLIENT } from '../database/database.module';
import { ScheduleInterviewDto, UpdateInterviewDto, InterviewListQueryDto } from './dto';
import { S3Service } from '@ai-job-portal/aws';
import { PaginationDto, hasCompanyPermission } from '@ai-job-portal/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
    @Optional() private readonly videoConferencingFactory?: VideoConferencingFactory,
  ) {}

  /**
   * Verify employer has access to a job's application (direct ownership or company-level).
   */
  private async verifyEmployerAccess(
    employer: any,
    jobEmployerId: string,
    companyId: string | null,
    userRole?: string,
  ): Promise<boolean> {
    // Direct ownership
    if (jobEmployerId === employer.id) return true;

    // Company-level fallback
    if (userRole && employer.companyId && companyId === employer.companyId) {
      return hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole,
        'company-applications:read',
      );
    }

    return false;
  }

  async schedule(userId: string, dto: ScheduleInterviewDto, userRole?: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, dto.applicationId),
      with: { job: true, jobSeeker: { with: { profile: true } } },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    const hasAccess = await this.verifyEmployerAccess(
      employer,
      application.job.employerId,
      application.job.companyId,
      userRole,
    );
    if (!hasAccess) throw new NotFoundException('Application not found');

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
        employerId: employer.userId,
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
        feedback: true,
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  async update(userId: string, interviewId: string, dto: UpdateInterviewDto, userRole?: string) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) throw new ForbiddenException('Access denied');
    const hasAccess = await this.verifyEmployerAccess(
      employer,
      interview.application.job.employerId,
      interview.application.job.companyId,
      userRole,
    );
    if (!hasAccess) throw new ForbiddenException('Access denied');

    // Store old scheduledAt for reschedule detection
    const oldScheduledAt = interview.scheduledAt;

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

    // Detect if interview is being rescheduled
    const isRescheduled =
      dto.scheduledAt && new Date(dto.scheduledAt).getTime() !== new Date(oldScheduledAt).getTime();

    // Track when the interview was rescheduled
    if (dto.status === 'rescheduled' || isRescheduled) {
      updateData.rescheduledAt = new Date();
      updateData.status = 'rescheduled';
    }

    await this.db.update(interviews).set(updateData).where(eq(interviews.id, interviewId));

    // Send reschedule notifications if date/time changed
    if (isRescheduled) {
      const candidateName =
        interview.application.jobSeeker?.profile?.firstName ||
        interview.application.jobSeeker?.email?.split('@')[0] ||
        'Candidate';
      const companyName = interview.application.job?.company?.name || 'Company';

      // Send candidate reschedule notification
      try {
        await this.sqsService.sendInterviewRescheduledNotification({
          userId: interview.application.jobSeekerId,
          interviewId: interview.id,
          jobTitle: interview.application.job.title,
          companyName,
          oldScheduledAt: oldScheduledAt.toISOString(),
          newScheduledAt: dto.scheduledAt!,
          duration: dto.duration || interview.duration,
          type: dto.type || interview.interviewType,
          meetingLink: updateData.meetingLink || interview.meetingLink || undefined,
          meetingPassword: interview.meetingPassword || undefined,
          interviewTool: dto.interviewTool || interview.interviewTool || undefined,
          reason: (dto as any).reason,
        });
        this.logger.log('✅ Candidate reschedule notification sent');
      } catch (error: any) {
        this.logger.warn(`⚠️ Failed to send candidate reschedule notification: ${error.message}`);
      }

      // Send employer reschedule notification
      try {
        await this.sqsService.sendEmployerInterviewRescheduledNotification({
          employerId: employer.userId,
          employerEmail: employer.email || 'noreply@aijobportal.com',
          interviewId: interview.id,
          jobTitle: interview.application.job.title,
          candidateName,
          oldScheduledAt: oldScheduledAt.toISOString(),
          newScheduledAt: dto.scheduledAt!,
          duration: dto.duration || interview.duration,
          type: dto.type || interview.interviewType,
          meetingLink: updateData.meetingLink || interview.meetingLink || undefined,
          hostJoinUrl: interview.hostJoinUrl || undefined,
          meetingPassword: interview.meetingPassword || undefined,
          interviewTool: dto.interviewTool || interview.interviewTool || undefined,
          reason: (dto as any).reason,
        });
        this.logger.log('✅ Employer reschedule notification sent');
      } catch (error: any) {
        this.logger.warn(`⚠️ Failed to send employer reschedule notification: ${error.message}`);
      }
    }

    return this.getById(interviewId);
  }

  async cancel(userId: string, interviewId: string, reason?: string, userRole?: string) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) throw new ForbiddenException('Access denied');
    const cancelAccess = await this.verifyEmployerAccess(
      employer,
      interview.application.job.employerId,
      interview.application.job.companyId,
      userRole,
    );
    if (!cancelAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Gather data before deletion/status update
    const candidateName =
      interview.application.jobSeeker?.profile?.firstName ||
      interview.application.jobSeeker?.email?.split('@')[0] ||
      'Candidate';
    const companyName = interview.application.job?.company?.name || 'Company';
    const scheduledAt = interview.scheduledAt.toISOString();
    const jobTitle = interview.application.job.title;
    const interviewType = interview.interviewType;

    // Delete video meeting if exists
    await this.deleteVideoMeeting(interview);

    await this.db
      .update(interviews)
      .set({ status: 'canceled' as any, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));

    // Send candidate cancellation notification
    try {
      await this.sqsService.sendInterviewCanceledNotification({
        userId: interview.application.jobSeekerId,
        interviewId: interview.id,
        jobTitle,
        companyName,
        scheduledAt,
        type: interviewType,
        reason,
      });
      this.logger.log('✅ Candidate cancellation notification sent');
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to send candidate cancellation: ${error.message}`);
    }

    // Send employer cancellation notification
    try {
      await this.sqsService.sendEmployerInterviewCanceledNotification({
        employerId: employer.userId,
        employerEmail: employer.email || 'noreply@aijobportal.com',
        interviewId: interview.id,
        jobTitle,
        candidateName,
        scheduledAt,
        type: interviewType,
        reason,
      });
      this.logger.log('✅ Employer cancellation notification sent');
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to send employer cancellation: ${error.message}`);
    }

    return { message: 'Interview canceled' };
  }

  async complete(
    userId: string,
    interviewId: string,
    dto: { rating?: number; notes?: string },
    userRole?: string,
  ) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) throw new ForbiddenException('Access denied');
    const completeAccess = await this.verifyEmployerAccess(
      employer,
      interview.application.job.employerId,
      interview.application.job.companyId,
      userRole,
    );
    if (!completeAccess) throw new ForbiddenException('Access denied');

    // Mark interview as completed
    await this.db
      .update(interviews)
      .set({
        status: 'completed' as any,
        interviewerNotes: dto.notes,
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId));

    // Update application status to interview_completed
    const previousStatus = interview.application.status;
    await this.db
      .update(jobApplications)
      .set({ status: 'interview_completed' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, interview.applicationId));

    // Record status change in history
    await this.db.insert(applicationHistory).values({
      applicationId: interview.applicationId,
      changedBy: userId,
      previousStatus: previousStatus as any,
      newStatus: 'interview_completed' as any,
      comment: 'Interview completed',
    });

    return { message: 'Interview completed' };
  }

  async getUpcoming(userId: string, role: string, query: PaginationDto) {
    const now = new Date();
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    const upcomingStatusFilter = or(
      eq(interviews.status, 'scheduled'),
      eq(interviews.status, 'rescheduled'),
      eq(interviews.status, 'confirmed'),
    );

    if (role === 'employer' || role === 'super_employer') {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (!employer)
        return {
          data: [],
          pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };

      // Get application IDs for jobs posted by this employer (or company if permitted)
      let jobCondition: any = eq(jobs.employerId, employer.id);
      if (employer.companyId) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          role,
          'company-applications:read',
        );
        if (hasPermission) {
          jobCondition = or(
            eq(jobs.employerId, employer.id),
            eq(jobs.companyId, employer.companyId),
          );
        }
      }
      const employerApplications = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(jobCondition);

      const applicationIds = employerApplications.map((a) => a.id);
      if (applicationIds.length === 0)
        return {
          data: [],
          pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };

      const whereCondition = and(
        gte(interviews.scheduledAt, now),
        upcomingStatusFilter,
        inArray(interviews.applicationId, applicationIds),
      );

      const data = await this.db.query.interviews.findMany({
        where: whereCondition,
        with: {
          application: {
            with: { job: true, jobSeeker: { with: { profile: true } } },
          },
        },
        orderBy: [interviews.scheduledAt],
        limit,
        offset,
      });

      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(interviews)
        .where(whereCondition);
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
      // Get application IDs for this candidate
      const candidateApplications = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(eq(jobApplications.jobSeekerId, userId));

      const applicationIds = candidateApplications.map((a) => a.id);
      if (applicationIds.length === 0)
        return {
          data: [],
          pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };

      const whereCondition = and(
        gte(interviews.scheduledAt, now),
        upcomingStatusFilter,
        inArray(interviews.applicationId, applicationIds),
      );

      const data = await this.db.query.interviews.findMany({
        where: whereCondition,
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
        .where(whereCondition);
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

  async getAll(userId: string, role: string, query: InterviewListQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    const isEmployer = role === 'employer' || role === 'super_employer';

    // Step 1: Get application IDs scoped to the user
    let applicationIds: string[] = [];
    let jobMap = new Map<string, string>();

    if (isEmployer) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (!employer) throw new ForbiddenException('Employer profile required');

      let baseJobCondition: any = eq(jobs.employerId, employer.id);
      if (employer.companyId) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          role,
          'company-applications:read',
        );
        if (hasPermission) {
          baseJobCondition = or(
            eq(jobs.employerId, employer.id),
            eq(jobs.companyId, employer.companyId),
          );
        }
      }
      let jobConditions: any = baseJobCondition;
      if (query.jobName) {
        jobConditions = and(jobConditions, ilike(jobs.title, `%${query.jobName}%`));
      }

      const employerJobs = await this.db.query.jobs.findMany({
        where: jobConditions,
        columns: { id: true, title: true },
      });

      if (employerJobs.length === 0) {
        return {
          data: [],
          pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
        };
      }

      const jobIds = employerJobs.map((j) => j.id);
      jobMap = new Map(employerJobs.map((j) => [j.id, j.title]));

      // If candidateName filter, narrow down applications by candidate profile
      let appConditions: any = inArray(jobApplications.jobId, jobIds);
      if (query.candidateName) {
        const matchingProfiles = await this.db.query.profiles.findMany({
          where: or(
            ilike(profiles.firstName, `%${query.candidateName}%`),
            ilike(profiles.lastName, `%${query.candidateName}%`),
          ),
          columns: { userId: true },
        });
        const matchingUserIds = matchingProfiles.map((p) => p.userId);
        if (matchingUserIds.length === 0) {
          return {
            data: [],
            pagination: {
              totalInterviews: 0,
              pageCount: 0,
              currentPage: page,
              hasNextPage: false,
            },
          };
        }
        appConditions = and(appConditions, inArray(jobApplications.jobSeekerId, matchingUserIds));
      }

      const apps = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(appConditions);
      applicationIds = apps.map((a) => a.id);
    } else {
      // Candidate flow
      let appConditions: any = eq(jobApplications.jobSeekerId, userId);

      if (query.jobName) {
        const matchingJobs = await this.db.query.jobs.findMany({
          where: ilike(jobs.title, `%${query.jobName}%`),
          columns: { id: true, title: true },
        });
        if (matchingJobs.length === 0) {
          return {
            data: [],
            pagination: {
              totalInterviews: 0,
              pageCount: 0,
              currentPage: page,
              hasNextPage: false,
            },
          };
        }
        const matchingJobIds = matchingJobs.map((j) => j.id);
        matchingJobs.forEach((j) => jobMap.set(j.id, j.title));
        appConditions = and(appConditions, inArray(jobApplications.jobId, matchingJobIds));
      }

      const apps = await this.db
        .select({ id: jobApplications.id, jobId: jobApplications.jobId })
        .from(jobApplications)
        .where(appConditions);
      applicationIds = apps.map((a) => a.id);
    }

    if (applicationIds.length === 0) {
      return {
        data: [],
        pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
      };
    }

    // Step 2: Build interview filter conditions
    const conditions: any[] = [inArray(interviews.applicationId, applicationIds)];

    if (query.status) {
      conditions.push(eq(interviews.status, query.status as any));
    }
    if (query.interviewType) {
      conditions.push(eq(interviews.interviewType, query.interviewType as any));
    }
    if (query.interviewMode) {
      conditions.push(eq(interviews.interviewMode, query.interviewMode as any));
    }
    if (query.fromDate) {
      conditions.push(gte(interviews.scheduledAt, new Date(query.fromDate)));
    }
    if (query.toDate) {
      conditions.push(lte(interviews.scheduledAt, new Date(query.toDate)));
    }

    const whereCondition = and(...conditions);

    // Step 3: Determine sort order
    const sortField = query.sortBy === 'createdAt' ? interviews.createdAt : interviews.scheduledAt;
    const sortDirection = query.sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    // Step 4: Fetch interviews with relations
    const data = await this.db.query.interviews.findMany({
      where: whereCondition,
      with: {
        application: {
          with: {
            job: { with: { employer: { with: { company: true } } } },
            jobSeeker: { with: { profile: true } },
          },
        },
        feedback: true,
      },
      orderBy: [sortDirection],
      limit,
      offset,
    });

    // Step 5: Count total
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(interviews)
      .where(whereCondition);
    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Step 6: Build enriched response
    const enrichedData = await Promise.all(
      data.map(async (interview) => {
        const app = interview.application as any;
        const profile = app?.jobSeeker?.profile;
        const job = app?.job;
        const company = job?.employer?.company;

        const profilePhotoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
          profile?.profilePhoto || null,
        );
        const companyLogoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
          company?.logoUrl || null,
        );

        return {
          id: interview.id,
          applicationId: interview.applicationId,
          jobId: job?.id || null,
          jobTitle: jobMap.get(job?.id) || job?.title || null,
          candidateId: app?.jobSeekerId || null,
          candidateName: profile
            ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null
            : null,
          candidateProfilePhoto: profilePhotoUrl,
          companyName: company?.name || null,
          companyLogo: companyLogoUrl,
          interviewType: interview.interviewType,
          interviewMode: interview.interviewMode,
          interviewTool: interview.interviewTool,
          scheduledAt: interview.scheduledAt,
          duration: interview.duration,
          location: interview.location,
          meetingLink: interview.meetingLink,
          status: interview.status,
          interviewerNotes: interview.interviewerNotes,
          candidateFeedback: interview.candidateFeedback,
          feedback: interview.feedback,
          rescheduledAt: interview.rescheduledAt,
          createdAt: interview.createdAt,
          updatedAt: interview.updatedAt,
        };
      }),
    );

    return {
      data: enrichedData,
      pagination: {
        totalInterviews: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
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
    userRole?: string,
  ) {
    const interview = (await this.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) throw new ForbiddenException('Access denied');
    const feedbackAccess = await this.verifyEmployerAccess(
      employer,
      interview.application.job.employerId,
      interview.application.job.companyId,
      userRole,
    );
    if (!feedbackAccess) throw new ForbiddenException('Access denied');

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
