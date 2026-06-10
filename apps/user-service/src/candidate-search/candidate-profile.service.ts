import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import {
  Database,
  profiles,
  employers,
  jobApplications,
  jobs,
  resumes,
  profileViews,
  messageThreads,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { SubscriptionHelper } from '../subscription/subscription.helper';

type EmployerRecord = {
  id: string;
  companyId: string | null;
  rbacRoleId?: string | null;
};

@Injectable()
export class CandidateProfileService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
    private readonly subscriptionHelper: SubscriptionHelper,
  ) {}

  /**
   * Unified employer-facing candidate profile, keyed by profileId.
   * Response shape mirrors GET /applications/:id/candidate-profile so the
   * frontend can reuse the same profile page from both search and application contexts.
   *
   * Viewing is free (no resume_access charge) — the charge happens on resume download.
   */
  async getCandidateProfile(
    userId: string,
    userRole: string,
    profileId: string,
    applicationId?: string,
  ) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const candidateProfile = await this.db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      with: {
        workExperiences: true,
        educationRecords: true,
        certifications: true,
        profileSkills: {
          with: {
            skill: true,
          },
        },
        jobPreferences: true,
      },
    });
    if (!candidateProfile) throw new NotFoundException('Candidate profile not found');

    let application: any = null;
    if (applicationId) {
      application = await this.db.query.jobApplications.findFirst({
        where: eq(jobApplications.id, applicationId),
        with: { job: true },
      });
      if (!application) throw new NotFoundException('Application not found');
      if (application.jobSeekerId !== candidateProfile.userId) {
        throw new BadRequestException('Application does not belong to this candidate');
      }

      // Same authorization rules as GET /applications/:id/candidate-profile:
      // direct job owner, or same company with company-applications:read permission
      const jobCompanyId = application.job?.companyId;
      const isDirectOwner = application.job?.employerId === employer.id;
      const isSameCompany =
        employer.companyId && jobCompanyId && jobCompanyId === employer.companyId;

      if (!isDirectOwner) {
        if (!isSameCompany) {
          throw new ForbiddenException('Access denied');
        }
        const hasAccess = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole || '',
          'company-applications:read',
        );
        if (!hasAccess) {
          throw new ForbiddenException('Access denied');
        }
      }
    } else {
      application = await this.findLatestCompanyApplication(employer, candidateProfile.userId);

      // Private profiles are only reachable when the candidate applied to the
      // employer's company. 404 (not 403) so ID probing can't confirm existence.
      if (candidateProfile.visibility === 'private' && !application) {
        throw new NotFoundException('Candidate profile not found');
      }
    }

    const profilePhotoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(
      candidateProfile.profilePhoto || null,
    );

    // Video resume lives on the profile; only expose when approved
    const videoProfileStatus = candidateProfile.videoProfileStatus;
    const isVideoApproved = videoProfileStatus === 'approved';
    const videoUrl =
      isVideoApproved && candidateProfile.videoResumeUrl
        ? await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(candidateProfile.videoResumeUrl)
        : null;

    const applicationPayload = application
      ? {
          applicationId: application.id,
          candidateId: candidateProfile.id,
          jobId: application.jobId,
          jobTitle: application.job?.title || null,
          status: application.status,
          appliedAt: application.appliedAt,
          resumeUrl: application.resumeUrl,
          resumeId: application.resumeUrl
            ? (
                await this.db.query.resumes.findFirst({
                  where: eq(resumes.filePath, application.resumeUrl),
                  columns: { id: true },
                })
              )?.id || null
            : null,
          coverLetter: application.coverLetter,
          threadId: await this.getThreadId(userId, candidateProfile.userId, application.id),
        }
      : null;

    const defaultResume = await this.findDefaultResume(candidateProfile.id);
    const alreadyPaid = await this.hasPaidResumeAccess(userId, candidateProfile.id);

    // Chat context: application thread when an application exists, otherwise the
    // employer↔candidate sourcing thread (started via POST /messages/threads
    // without an applicationId). Null means no conversation yet.
    const threadId = applicationPayload
      ? applicationPayload.threadId
      : await this.getSourcingThreadId(userId, candidateProfile.userId);

    return {
      threadId,
      profile: {
        userId: candidateProfile.userId,
        firstName: candidateProfile.firstName,
        lastName: candidateProfile.lastName,
        email: candidateProfile.email,
        phone: candidateProfile.phone,
        headline: candidateProfile.headline,
        professionalSummary: candidateProfile.professionalSummary,
        totalExperienceYears: candidateProfile.totalExperienceYears,
        city: candidateProfile.city,
        state: candidateProfile.state,
        country: candidateProfile.country,
        profilePhoto: profilePhotoUrl,
        visibility: candidateProfile.visibility,
      },
      workExperiences: candidateProfile.workExperiences || [],
      educationRecords: candidateProfile.educationRecords || [],
      certifications: candidateProfile.certifications || [],
      skills: (candidateProfile.profileSkills || []).map((ps: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { skill, ...rest } = ps;
        return {
          ...rest,
          skillName: skill?.name,
          category: skill?.category,
        };
      }),
      jobPreferences: candidateProfile.jobPreferences || null,
      application: applicationPayload,
      // Metadata only — the signed download URL is issued by GET /candidates/:profileId/resume,
      // which is where the resume_access credit is charged
      resume: defaultResume
        ? {
            id: defaultResume.id,
            fileName: defaultResume.fileName,
            resumeName: defaultResume.resumeName,
            fileType: defaultResume.fileType,
            fileSize: defaultResume.fileSize,
            updatedAt: defaultResume.updatedAt,
            isDownloaded: alreadyPaid,
          }
        : null,
      videoResume: videoUrl
        ? {
            url: videoUrl,
            status: videoProfileStatus,
          }
        : null,
    };
  }

  /**
   * Charged resume download. First download of a candidate consumes one
   * resume_access credit (tracked via profile_views per employer user + candidate);
   * subsequent downloads are free.
   */
  async downloadResume(userId: string, profileId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const candidateProfile = await this.db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { id: true, userId: true, visibility: true },
    });
    if (!candidateProfile) throw new NotFoundException('Candidate profile not found');

    // Same reachability rule as the profile view — prevents private-profile resume leak
    if (candidateProfile.visibility === 'private') {
      const application = await this.findLatestCompanyApplication(
        employer,
        candidateProfile.userId,
      );
      if (!application) throw new NotFoundException('Candidate profile not found');
    }

    const defaultResume = await this.findDefaultResume(candidateProfile.id);
    if (!defaultResume) throw new NotFoundException('Resume not found for this candidate');

    const alreadyPaid = await this.hasPaidResumeAccess(userId, candidateProfile.id);
    if (!alreadyPaid) {
      const subscription = await this.subscriptionHelper.getActiveSubscription(employer.id);
      if (!subscription) {
        throw new ForbiddenException(
          'No active subscription found. Please subscribe to a plan to access candidate resumes.',
        );
      }
      this.subscriptionHelper.checkLimit(subscription, 'resume_access');

      await this.db
        .insert(profileViews)
        .values({ profileId: candidateProfile.id, employerId: userId });
      await this.subscriptionHelper.incrementUsage(subscription.id, 'resume_access');
    }

    const url = await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(defaultResume.filePath);

    return {
      message: 'Resume download URL generated',
      data: {
        id: defaultResume.id,
        fileName: defaultResume.fileName,
        resumeName: defaultResume.resumeName,
        fileType: defaultResume.fileType,
        fileSize: defaultResume.fileSize,
        url,
      },
    };
  }

  /**
   * Latest application by this candidate to a job owned by the employer
   * (directly or via the employer's company). Null if they never applied.
   */
  private async findLatestCompanyApplication(employer: EmployerRecord, jobSeekerId: string) {
    const ownership = employer.companyId
      ? or(eq(jobs.employerId, employer.id), eq(jobs.companyId, employer.companyId))
      : eq(jobs.employerId, employer.id);

    const rows = await this.db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        jobSeekerId: jobApplications.jobSeekerId,
        status: jobApplications.status,
        appliedAt: jobApplications.appliedAt,
        resumeUrl: jobApplications.resumeUrl,
        coverLetter: jobApplications.coverLetter,
        jobTitle: jobs.title,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(and(eq(jobApplications.jobSeekerId, jobSeekerId), ownership))
      .orderBy(desc(jobApplications.appliedAt))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    const { jobTitle, ...rest } = row;
    return { ...rest, job: { title: jobTitle } };
  }

  /** Candidate's default resume (isDefault first, else most recently updated). */
  private async findDefaultResume(profileId: string) {
    return this.db.query.resumes.findFirst({
      where: eq(resumes.profileId, profileId),
      orderBy: [desc(resumes.isDefault), desc(resumes.updatedAt)],
    });
  }

  /**
   * Whether this employer user already spent a resume_access credit on this candidate.
   * profile_views is the shared payment marker — also set by the application-based
   * profile endpoint, so a candidate is charged at most once per employer user.
   */
  private async hasPaidResumeAccess(userId: string, profileId: string): Promise<boolean> {
    const existing = await this.db.query.profileViews.findFirst({
      where: and(eq(profileViews.employerId, userId), eq(profileViews.profileId, profileId)),
    });
    return !!existing;
  }

  /**
   * Looks up an existing message thread between two users for a specific application.
   */
  private async getThreadId(
    userIdA: string,
    userIdB: string,
    applicationId: string,
  ): Promise<string | null> {
    const participants = [userIdA, userIdB].sort().join(',');
    const thread = await this.db.query.messageThreads.findFirst({
      where: and(
        eq(messageThreads.participants, participants),
        eq(messageThreads.applicationId, applicationId),
      ),
      columns: { id: true },
    });
    return thread?.id || null;
  }

  /**
   * Looks up an existing sourcing thread (employer-initiated, no application)
   * between this employer user and the candidate.
   */
  private async getSourcingThreadId(userIdA: string, userIdB: string): Promise<string | null> {
    const participants = [userIdA, userIdB].sort().join(',');
    const thread = await this.db.query.messageThreads.findFirst({
      where: and(
        eq(messageThreads.participants, participants),
        isNull(messageThreads.applicationId),
      ),
      columns: { id: true },
    });
    return thread?.id || null;
  }
}
