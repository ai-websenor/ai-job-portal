import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, inArray, or, ilike, sql } from 'drizzle-orm';
import {
  Database,
  interviews,
  jobApplications,
  applicationHistory,
  jobs,
  employers,
  profiles,
} from '@ai-job-portal/database';
import { SqsService, S3Service } from '@ai-job-portal/aws';
import { MeetingDetails } from '@ai-job-portal/video-conferencing';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  ScheduleInterviewDto,
  UpdateInterviewDto,
  InterviewListQueryDto,
  UpcomingInterviewQueryDto,
} from './dto';
import { APPLICATION_EVENT_TYPES } from '../application/application-history.constants';
import { InterviewTimeHelper } from './interview-time.helper';
import { InterviewConflictHelper } from './interview-conflict.helper';
import { InterviewVideoService } from './interview-video.service';
import { InterviewLookupHelper } from './interview-lookup.helper';
import { InterviewEnrichmentHelper } from './interview-enrichment.helper';
import { InterviewFeedbackService } from './interview-feedback.service';

// Application statuses that are closed/terminal — no further interviews allowed.
const TERMINAL_APPLICATION_STATUSES: string[] = [
  'hired',
  'rejected',
  'withdrawn',
  'offer_accepted',
  'offer_rejected',
];

// Interview-round statuses that mean the round is still open (not yet finished).
// Note: a conducted round is stored as 'completed' even while the overall process
// continues (application = interview_in_progress), so 'in_progress' is NOT a round
// status and is intentionally absent here.
const ACTIVE_INTERVIEW_STATUSES: string[] = ['scheduled', 'confirmed', 'rescheduled'];

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
    private readonly s3Service: S3Service,
    private readonly timeHelper: InterviewTimeHelper,
    private readonly conflictHelper: InterviewConflictHelper,
    private readonly videoService: InterviewVideoService,
    private readonly lookupHelper: InterviewLookupHelper,
    private readonly enrichmentHelper: InterviewEnrichmentHelper,
    private readonly feedbackService: InterviewFeedbackService,
  ) {}

  /**
   * Throws ForbiddenException unless the user owns the interview:
   * - employer/super_employer: must own the job the interview belongs to
   * - candidate: must be the applicant on the interview's application
   * Returns the loaded interview (with relations) so callers can reuse it.
   */
  private async assertInterviewAccess(userId: string, role: string, interview: any) {
    if (role === 'employer' || role === 'super_employer') {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (!employer || interview.application?.job?.employerId !== employer.id) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      if (interview.application?.jobSeekerId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
  }

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

    // Block scheduling for applications that are already closed.
    if (TERMINAL_APPLICATION_STATUSES.includes(application.status)) {
      throw new BadRequestException(
        `Cannot schedule an interview: this application is already ${String(
          application.status,
        ).replace(/_/g, ' ')}.`,
      );
    }

    // A new round can only be added once the previous round is finished. Block
    // when the latest existing round is still active (scheduled / confirmed /
    // rescheduled) — the current round must be completed (or canceled) first.
    const latestRound = await this.db.query.interviews.findFirst({
      where: eq(interviews.applicationId, dto.applicationId),
      orderBy: [desc(interviews.createdAt)],
      columns: { status: true },
    });
    if (latestRound && ACTIVE_INTERVIEW_STATUSES.includes(latestRound.status as string)) {
      throw new BadRequestException(
        'Complete the current interview round before scheduling a new one.',
      );
    }

    // Auto-generate meeting if tool is zoom or teams
    let meetingDetails: MeetingDetails | null = null;
    let meetingError: string | null = null;

    const interviewTimezone = dto.timezone || this.timeHelper.defaultInterviewTimezone;
    const normalizedScheduledAt = await this.timeHelper.normalizeScheduledAt(
      userId,
      dto.scheduledAt,
      interviewTimezone,
    );
    this.timeHelper.assertFutureDateTime(normalizedScheduledAt, 'scheduled');

    // Double-booking warning (soft): if this employer already has an overlapping
    // interview, surface a 409 the client can override by resending with
    // ignoreConflict=true (the "schedule anyway" path behind the warning modal).
    if (!dto.ignoreConflict) {
      const conflicts = await this.conflictHelper.findEmployerTimeConflicts(
        employer.id,
        normalizedScheduledAt,
        dto.duration || 60,
      );
      if (conflicts.length) {
        throw new ConflictException({
          code: 'INTERVIEW_TIME_CONFLICT',
          message: 'You already have an interview scheduled in this time slot.',
          conflicts,
        });
      }
    }

    const normalizedScheduledAtIso = normalizedScheduledAt.toISOString();

    if (dto.interviewTool === 'zoom' || dto.interviewTool === 'teams') {
      try {
        meetingDetails = await this.videoService.createVideoMeeting(
          dto,
          application,
          normalizedScheduledAt,
          interviewTimezone,
        );
        this.logger.log(`Auto-generated ${dto.interviewTool} meeting: ${meetingDetails.meetingId}`);
      } catch (error: any) {
        this.logger.error(`Failed to create ${dto.interviewTool} meeting: ${error.message}`);
        meetingError = error.message;
        // Continue with interview creation without meeting link
      }
    }

    const formattedScheduledAt = this.timeHelper.formatInterviewDateTime(
      normalizedScheduledAt,
      interviewTimezone,
    );

    const [interview] = await this.db
      .insert(interviews)
      .values({
        applicationId: dto.applicationId,
        interviewType: dto.type as any,
        customType: dto.type === 'other' ? dto.customType : null,
        roundName: dto.roundName,
        interviewMode: (dto.interviewMode || 'online') as any,
        interviewTool: dto.interviewTool as any,
        scheduledAt: normalizedScheduledAt,
        duration: dto.duration || 60,
        location: dto.location,
        timezone: interviewTimezone,
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

    // Scheduling any round (first or follow-up) puts the application into the
    // "interview scheduled" state.
    const previousStatus = application.status;
    const newAppStatus = 'interview_scheduled';
    await this.db
      .update(jobApplications)
      .set({ status: newAppStatus as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, dto.applicationId));

    // Add history entry for interview scheduled
    const scheduledTypeLabel = dto.type === 'other' ? dto.customType || 'Other' : dto.type;
    await this.db.insert(applicationHistory).values({
      applicationId: dto.applicationId,
      changedBy: userId,
      previousStatus: previousStatus as any,
      newStatus: newAppStatus as any,
      eventType: APPLICATION_EVENT_TYPES.INTERVIEW_SCHEDULED,
      interviewId: interview.id,
      comment: `Interview scheduled: ${scheduledTypeLabel}${
        dto.roundName ? ` (${dto.roundName})` : ''
      } round on ${formattedScheduledAt}`,
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
        companyName,
        scheduledAt: normalizedScheduledAtIso,
        duration: dto.duration || 60,
        type: dto.type,
        interviewTool: dto.interviewTool,
        meetingLink: interview.meetingLink || undefined,
        meetingPassword: interview.meetingPassword || undefined,
        timezone: interviewTimezone,
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
        scheduledAt: normalizedScheduledAtIso,
        duration: dto.duration || 60,
        type: dto.type,
        interviewMode: dto.interviewMode || 'online',
        interviewTool: dto.interviewTool,
        meetingLink: interview.meetingLink || undefined,
        meetingPassword: interview.meetingPassword || undefined,
        hostJoinUrl: interview.hostJoinUrl || undefined,
        location: dto.location,
        timezone: interviewTimezone,
      });
      this.logger.log('✅ SQS employer notification sent successfully');
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to send SQS employer notification: ${error.message}`);
      // Don't fail the interview creation
    }

    return interview;
  }

  async getById(id: string) {
    return this.lookupHelper.getById(id);
  }

  /**
   * Ownership-scoped interview details for the `GET /interviews/:id` route.
   * Without this check any authenticated user could read any interview by UUID.
   */
  async getDetailsForUser(userId: string, role: string, id: string) {
    const interview = (await this.lookupHelper.getById(id)) as any;
    await this.assertInterviewAccess(userId, role, interview);

    // Derive the sequential round number from sibling interviews on the same
    // application in CREATION order (createdAt). Round numbers are a stable
    // identity tied to the order rounds were added — they must NOT depend on
    // scheduledAt, otherwise rescheduling a round to a later/earlier date would
    // renumber it. Matches the order used by getRoundsByApplication.
    const siblings = await this.db.query.interviews.findMany({
      where: eq(interviews.applicationId, interview.applicationId),
      columns: { id: true },
      orderBy: [asc(interviews.createdAt)],
    });
    const roundNumber = siblings.findIndex((s) => s.id === interview.id) + 1;

    const reasons = (await this.enrichmentHelper.getRoundReasonsMap(interview.applicationId)).get(
      interview.id,
    );
    const enriched = await this.enrichmentHelper.enrichInterviewRow(interview);
    return {
      ...enriched,
      roundNumber: roundNumber || null,
      rescheduleReason: reasons?.rescheduleReason ?? null,
      cancelReason: reasons?.cancelReason ?? null,
    };
  }

  /**
   * All interview rounds for a single application, ordered by creation order
   * (createdAt) so roundNumber is a stable identity, as a history/status track.
   * Scoped to the requesting user (candidate applicant or owning employer).
   * Not paginated — rounds per application are inherently few.
   */
  async getRoundsByApplication(userId: string, role: string, applicationId: string) {
    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: {
        job: { with: { employer: { with: { company: true } } } },
        jobSeeker: { with: { profile: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    // Reuse the interview-access guard shape by checking the application owner.
    await this.assertInterviewAccess(userId, role, { application });

    const rounds = await this.db.query.interviews.findMany({
      where: eq(interviews.applicationId, applicationId),
      with: {
        application: {
          with: {
            job: { with: { employer: { with: { company: true } } } },
            jobSeeker: { with: { profile: true } },
          },
        },
        feedback: true,
      },
      // Creation order — roundNumber (index+1 below) is the order rounds were
      // added, independent of scheduledAt (reschedules must not renumber).
      orderBy: [asc(interviews.createdAt)],
    });

    const reasonsMap = await this.enrichmentHelper.getRoundReasonsMap(applicationId);

    const enrichedRounds = await Promise.all(
      rounds.map(async (round, index) => {
        const reasons = reasonsMap.get(round.id);
        return {
          ...(await this.enrichmentHelper.enrichInterviewRow(round)),
          roundNumber: index + 1,
          // Contextual reasons (from history) so each round can show why it was
          // rescheduled/canceled. Completion note = interviewerNotes (enriched).
          rescheduleReason: reasons?.rescheduleReason ?? null,
          cancelReason: reasons?.cancelReason ?? null,
        };
      }),
    );

    const job = (application as any).job;
    const company = job?.employer?.company;
    const profile = (application as any).jobSeeker?.profile;
    const companyLogoUrl = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(
      company?.logoUrl || null,
    );

    return {
      data: {
        application: {
          id: application.id,
          jobId: job?.id || null,
          jobTitle: job?.title || null,
          companyName: company?.name || null,
          companyLogo: companyLogoUrl,
          candidateId: application.jobSeekerId || null,
          candidateName: profile
            ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null
            : null,
          currentStatus: application.status,
        },
        rounds: enrichedRounds,
        totalRounds: enrichedRounds.length,
        // The most recently added round (highest roundNumber). Null when no rounds
        // exist yet. Lets the UI surface the current round without re-scanning.
        latestInterviewRound: enrichedRounds.length
          ? enrichedRounds[enrichedRounds.length - 1]
          : null,
      },
    };
  }

  async update(userId: string, interviewId: string, dto: UpdateInterviewDto) {
    const interview = (await this.lookupHelper.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    // Store old scheduledAt for reschedule detection
    const oldScheduledAt = interview.scheduledAt;

    const updateData: any = {
      updatedAt: new Date(),
    };

    const interviewTimezone =
      dto.timezone || interview.timezone || this.timeHelper.defaultInterviewTimezone;
    const normalizedScheduledAt = dto.scheduledAt
      ? await this.timeHelper.normalizeScheduledAt(userId, dto.scheduledAt, interviewTimezone)
      : null;

    if (normalizedScheduledAt)
      this.timeHelper.assertFutureDateTime(normalizedScheduledAt, 'rescheduled');
    if (normalizedScheduledAt) updateData.scheduledAt = normalizedScheduledAt;
    if (dto.type) {
      updateData.interviewType = dto.type;
      // Clear stale custom name when switching away from "other"
      if (dto.type !== 'other') updateData.customType = null;
    }
    if (dto.customType !== undefined) {
      updateData.customType = dto.type === 'other' ? dto.customType : null;
    }
    if (dto.roundName !== undefined) updateData.roundName = dto.roundName;
    if (dto.duration) updateData.duration = dto.duration;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.meetingLink !== undefined) updateData.meetingLink = dto.meetingLink;
    if (dto.interviewMode !== undefined) updateData.interviewMode = dto.interviewMode;
    if (dto.interviewTool !== undefined) updateData.interviewTool = dto.interviewTool;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.status) updateData.status = dto.status;

    // Detect if interview is being rescheduled
    const isRescheduled =
      !!normalizedScheduledAt &&
      normalizedScheduledAt.getTime() !== new Date(oldScheduledAt).getTime();

    // A finished round (completed / canceled / no_show) cannot be moved to a new
    // time — only an active round can be rescheduled.
    if (isRescheduled && !ACTIVE_INTERVIEW_STATUSES.includes(interview.status)) {
      throw new BadRequestException(`Cannot reschedule a ${interview.status} interview.`);
    }

    // Double-booking warning (soft) on reschedule — same employer-scope check as
    // scheduling. Excludes this interview so it never conflicts with itself.
    if (isRescheduled && !dto.ignoreConflict) {
      const conflicts = await this.conflictHelper.findEmployerTimeConflicts(
        employer.id,
        normalizedScheduledAt!,
        dto.duration || interview.duration || 60,
        interviewId,
      );
      if (conflicts.length) {
        throw new ConflictException({
          code: 'INTERVIEW_TIME_CONFLICT',
          message: 'You already have an interview scheduled in this time slot.',
          conflicts,
        });
      }
    }

    // Track when the interview was rescheduled
    const wasRescheduled = dto.status === 'rescheduled' || isRescheduled;
    if (wasRescheduled) {
      updateData.rescheduledAt = new Date();
      updateData.status = 'rescheduled';
    }

    await this.db.update(interviews).set(updateData).where(eq(interviews.id, interviewId));

    // Reflect reschedule on the application status + history
    if (wasRescheduled) {
      const previousAppStatus = interview.application.status;
      await this.db
        .update(jobApplications)
        .set({ status: 'interview_rescheduled' as any, updatedAt: new Date() })
        .where(eq(jobApplications.id, interview.applicationId));

      const formattedNewTime = this.timeHelper.formatInterviewDateTime(
        normalizedScheduledAt || interview.scheduledAt,
        interviewTimezone,
      );
      const reschedTypeLabel =
        (dto.type || interview.interviewType) === 'other'
          ? dto.customType || interview.customType || 'Other'
          : dto.type || interview.interviewType;
      const reschedRoundLabel = dto.roundName ?? interview.roundName;
      const reschedReason = (dto as any).reason;
      await this.db.insert(applicationHistory).values({
        applicationId: interview.applicationId,
        changedBy: userId,
        previousStatus: previousAppStatus as any,
        newStatus: 'interview_rescheduled' as any,
        eventType: APPLICATION_EVENT_TYPES.INTERVIEW_RESCHEDULED,
        interviewId: interview.id,
        metadata: {
          reason: reschedReason ?? null,
          previousScheduledAt: oldScheduledAt ?? null,
        },
        comment: `Interview rescheduled: ${reschedTypeLabel}${
          reschedRoundLabel ? ` (${reschedRoundLabel})` : ''
        } round moved to ${formattedNewTime}${reschedReason ? ` — Reason: ${reschedReason}` : ''}`,
      });
    }

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
          newScheduledAt: normalizedScheduledAt!.toISOString(),
          duration: dto.duration || interview.duration,
          type: dto.type || interview.interviewType,
          meetingLink: updateData.meetingLink || interview.meetingLink || undefined,
          meetingPassword: interview.meetingPassword || undefined,
          interviewTool: dto.interviewTool || interview.interviewTool || undefined,
          reason: (dto as any).reason,
          timezone: interviewTimezone,
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
          newScheduledAt: normalizedScheduledAt!.toISOString(),
          duration: dto.duration || interview.duration,
          type: dto.type || interview.interviewType,
          meetingLink: updateData.meetingLink || interview.meetingLink || undefined,
          hostJoinUrl: interview.hostJoinUrl || undefined,
          meetingPassword: interview.meetingPassword || undefined,
          interviewTool: dto.interviewTool || interview.interviewTool || undefined,
          reason: (dto as any).reason,
          timezone: interviewTimezone,
        });
        this.logger.log('✅ Employer reschedule notification sent');
      } catch (error: any) {
        this.logger.warn(`⚠️ Failed to send employer reschedule notification: ${error.message}`);
      }
    }

    return this.lookupHelper.getById(interviewId);
  }

  async cancel(userId: string, interviewId: string, reason?: string) {
    const interview = (await this.lookupHelper.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
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
    await this.videoService.deleteVideoMeeting(interview);

    await this.db
      .update(interviews)
      .set({ status: 'canceled' as any, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId));

    // Reflect cancellation on the application status + history
    const previousAppStatus = interview.application.status;
    await this.db
      .update(jobApplications)
      .set({ status: 'interview_cancelled' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, interview.applicationId));

    await this.db.insert(applicationHistory).values({
      applicationId: interview.applicationId,
      changedBy: userId,
      previousStatus: previousAppStatus as any,
      newStatus: 'interview_cancelled' as any,
      eventType: APPLICATION_EVENT_TYPES.INTERVIEW_CANCELLED,
      interviewId: interview.id,
      metadata: { reason: reason ?? null },
      comment: reason ? `Interview cancelled: ${reason}` : 'Interview cancelled',
    });

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
        timezone: interview.timezone || this.timeHelper.defaultInterviewTimezone,
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
        timezone: interview.timezone || this.timeHelper.defaultInterviewTimezone,
      });
      this.logger.log('✅ Employer cancellation notification sent');
    } catch (error: any) {
      this.logger.warn(`⚠️ Failed to send employer cancellation: ${error.message}`);
    }

    return { message: 'Interview canceled' };
  }

  async complete(userId: string, interviewId: string, dto: { rating?: number; notes?: string }) {
    const interview = (await this.lookupHelper.getById(interviewId)) as any;

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer || interview.application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    // A canceled interview cannot be completed. (A round already 'completed' is
    // allowed through here, since that path finalizes a multi-round process.)
    if (interview.status === 'canceled') {
      throw new BadRequestException('Cannot complete a canceled interview.');
    }

    // Mark interview as completed
    await this.db
      .update(interviews)
      .set({
        status: 'completed' as any,
        interviewerNotes: dto.notes,
        rating: dto.rating,
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
      eventType: APPLICATION_EVENT_TYPES.INTERVIEW_COMPLETED,
      interviewId: interview.id,
      metadata: { notes: dto.notes ?? null, rating: dto.rating ?? null },
      comment: dto.notes ? `Interview completed — ${dto.notes}` : 'Interview completed',
    });

    return { message: 'Interview completed' };
  }

  async getUpcoming(userId: string, role: string, query: UpcomingInterviewQueryDto) {
    const now = new Date();
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const offset = (page - 1) * limit;

    const isEmployer = role === 'employer' || role === 'super_employer';

    // Scope to the requesting user's application IDs (employer's jobs, or the
    // candidate's own applications).
    let applicationIds: string[];
    if (isEmployer) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (!employer) return this.enrichmentHelper.emptyUpcoming(page);

      const apps = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
        .where(eq(jobs.employerId, employer.id));
      applicationIds = apps.map((a) => a.id);
    } else {
      const apps = await this.db
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(eq(jobApplications.jobSeekerId, userId));
      applicationIds = apps.map((a) => a.id);
    }

    if (applicationIds.length === 0) return this.enrichmentHelper.emptyUpcoming(page);

    const conditions: any[] = [
      gte(interviews.scheduledAt, now),
      or(
        eq(interviews.status, 'scheduled'),
        eq(interviews.status, 'rescheduled'),
        eq(interviews.status, 'confirmed'),
      ),
      inArray(interviews.applicationId, applicationIds),
    ];
    if (query.interviewType) {
      conditions.push(eq(interviews.interviewType, query.interviewType as any));
    }
    if (query.interviewMode) {
      conditions.push(eq(interviews.interviewMode, query.interviewMode as any));
    }
    const whereCondition = and(...conditions);

    const data = await this.db.query.interviews.findMany({
      where: whereCondition,
      with: {
        application: {
          with: {
            job: { with: { employer: { with: { company: true } } } },
            jobSeeker: { with: { profile: true } },
          },
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

    // Flatten companyName from job.employer.company while keeping the existing
    // nested shape consumers already read.
    const enriched = data.map((iv: any) => ({
      ...iv,
      companyName: iv.application?.job?.employer?.company?.name ?? null,
    }));

    return {
      data: enriched,
      pagination: {
        totalInterviews: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  async getAll(userId: string, role: string, query: InterviewListQueryDto) {
    let page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    let offset = (page - 1) * limit;

    const isEmployer = role === 'employer' || role === 'super_employer';

    // Step 1: Get application IDs scoped to the user
    let applicationIds: string[] = [];
    let jobMap = new Map<string, string>();

    if (isEmployer) {
      const employer = await this.db.query.employers.findFirst({
        where: eq(employers.userId, userId),
      });
      if (!employer) throw new ForbiddenException('Employer profile required');

      let jobConditions: any = eq(jobs.employerId, employer.id);
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

      if (query.jobId) {
        appConditions = and(appConditions, eq(jobApplications.jobId, query.jobId));
      }

      // Combined search: candidate name OR job title/role
      if (query.search) {
        const term = query.search.toLowerCase();
        const searchJobIds = employerJobs
          .filter((j) => (j.title || '').toLowerCase().includes(term))
          .map((j) => j.id);

        const matchingProfiles = await this.db.query.profiles.findMany({
          where: or(
            ilike(profiles.firstName, `%${query.search}%`),
            ilike(profiles.lastName, `%${query.search}%`),
          ),
          columns: { userId: true },
        });
        const matchingUserIds = matchingProfiles.map((p) => p.userId);

        const searchConds: any[] = [];
        if (searchJobIds.length > 0) searchConds.push(inArray(jobApplications.jobId, searchJobIds));
        if (matchingUserIds.length > 0)
          searchConds.push(inArray(jobApplications.jobSeekerId, matchingUserIds));
        if (searchConds.length === 0) {
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
        appConditions = and(appConditions, or(...searchConds));
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

      if (query.jobId) {
        appConditions = and(appConditions, eq(jobApplications.jobId, query.jobId));
      }

      // Combined search: for candidates, matches job title/role
      if (query.search) {
        const matchingJobs = await this.db.query.jobs.findMany({
          where: ilike(jobs.title, `%${query.search}%`),
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
        matchingJobs.forEach((j) => jobMap.set(j.id, j.title));
        appConditions = and(
          appConditions,
          inArray(
            jobApplications.jobId,
            matchingJobs.map((j) => j.id),
          ),
        );
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
      // `upcoming` is a candidate-facing segment, not a raw status: it covers
      // every active future round (scheduled / rescheduled).
      if (query.status === 'upcoming') {
        conditions.push(inArray(interviews.status, ['scheduled', 'rescheduled'] as any));
      } else {
        conditions.push(eq(interviews.status, query.status as any));
      }
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
      const toDate = new Date(query.toDate);
      // Date-only values (e.g. 2026-06-10) must include the entire end day
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      conditions.push(lte(interviews.scheduledAt, toDate));
    }

    const whereCondition = and(...conditions);

    // Step 3: Determine sort order
    const sortField = query.sortBy === 'createdAt' ? interviews.createdAt : interviews.scheduledAt;
    const sortDirection = query.sortOrder === 'desc' ? desc(sortField) : asc(sortField);

    // Step 4: Collapse to ONE row per application — a job application maps to a
    // single interview record in the list; its rounds are shown on the detail
    // page. The representative round is the LATEST (max createdAt) among the
    // rounds matching the active filters, so the row reflects the current state
    // and always matches the filter. Pagination counts applications, not rounds.
    const matching = await this.db
      .select({
        id: interviews.id,
        applicationId: interviews.applicationId,
        createdAt: interviews.createdAt,
      })
      .from(interviews)
      .where(whereCondition)
      .orderBy(asc(interviews.createdAt));

    const latestRoundByApp = new Map<string, string>();
    for (const row of matching) {
      // asc order → the last write per application is its latest round.
      latestRoundByApp.set(row.applicationId, row.id);
    }
    const representativeIds = [...latestRoundByApp.values()];
    const total = representativeIds.length;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return {
        data: [],
        pagination: { totalInterviews: 0, pageCount: 0, currentPage: page, hasNextPage: false },
      };
    }

    // Clamp the requested page to the available range. Without this, a filter
    // that shrinks the result set (e.g. applied while on page 2) returns an
    // empty data array even though matching interviews exist on page 1.
    if (page > totalPages) {
      page = totalPages;
    }
    offset = (page - 1) * limit;

    // Step 5: Fetch the page's representative interviews with relations
    const data = await this.db.query.interviews.findMany({
      where: inArray(interviews.id, representativeIds),
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

    // Step 5b: Derive each interview's round number in CREATION order (createdAt)
    // per application, matching getRoundsByApplication / details ordering. Round
    // numbers are stable identities — independent of scheduledAt so reschedules
    // don't renumber. Computed over ALL rounds of the page's applications, not
    // just the current page slice.
    const pageAppIds = [...new Set(data.map((i: any) => i.applicationId))];
    const roundNumberById = new Map<string, number>();
    // Total rounds per application so the deduped row can show "Round X of Y".
    const totalRoundsByApp = new Map<string, number>();
    if (pageAppIds.length) {
      const siblings = await this.db.query.interviews.findMany({
        where: inArray(interviews.applicationId, pageAppIds),
        columns: { id: true, applicationId: true, createdAt: true },
        orderBy: [asc(interviews.createdAt)],
      });
      const perAppCounter = new Map<string, number>();
      for (const s of siblings) {
        const n = (perAppCounter.get(s.applicationId) || 0) + 1;
        perAppCounter.set(s.applicationId, n);
        roundNumberById.set(s.id, n);
      }
      for (const [appId, count] of perAppCounter) {
        totalRoundsByApp.set(appId, count);
      }
    }

    // Step 6: Build enriched response
    const enrichedData = await Promise.all(
      data.map(async (interview: any) => ({
        ...(await this.enrichmentHelper.enrichInterviewRow(interview, jobMap)),
        roundNumber: roundNumberById.get(interview.id) ?? null,
        totalRounds: totalRoundsByApp.get(interview.applicationId) ?? 1,
      })),
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
  ) {
    return this.feedbackService.addInterviewerFeedback(userId, interviewId, dto);
  }

  async submitFeedback(userId: string, interviewId: string, feedback: string) {
    return this.feedbackService.submitFeedback(userId, interviewId, feedback);
  }
}
