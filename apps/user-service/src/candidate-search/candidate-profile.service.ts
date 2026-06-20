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
  subscriptionPlans,
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
   * Viewing a search-sourced candidate spends one profile_access credit on first access
   * (deduped per employer user + candidate via profile_views, shared with resume download).
   * Applicants (candidates who applied to this employer's company) are free. Contact details
   * (email/phone) are masked unless the candidate is an applicant or the plan allows contact.
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

    // Candidates who applied to this employer's company are "applicants": viewing them
    // (and their contact) is always free and unmasked. For search-sourced candidates we
    // charge one profile_access credit on first view and gate contact behind the plan.
    const isApplicant = !!application;
    const access = await this.resolveProfileAccess(
      employer.id,
      userId,
      candidateProfile.id,
      isApplicant,
    );

    // Chat context: this viewer's application thread when one exists, otherwise
    // their own direct (sourcing) thread with the candidate. The fallback matters
    // when the application thread belongs to a colleague (company-level application
    // lookup) — this employer still gets routed to their own conversation.
    // Null means no conversation yet.
    const threadId =
      applicationPayload?.threadId ??
      (await this.getSourcingThreadId(userId, candidateProfile.userId));

    return {
      threadId,
      profile: {
        userId: candidateProfile.userId,
        firstName: candidateProfile.firstName,
        lastName: candidateProfile.lastName,
        // Contact is hidden unless the candidate applied here, or the plan allows
        // contact viewing AND a profile_access credit has unlocked this candidate.
        email: access.contactVisible ? candidateProfile.email : null,
        phone: access.contactVisible ? candidateProfile.phone : null,
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
      // Metadata only — the signed download URL is issued by GET /candidates/:profileId/resume.
      // The profile_access credit is charged on first view or first download (whichever is first).
      resume: defaultResume
        ? {
            id: defaultResume.id,
            fileName: defaultResume.fileName,
            resumeName: defaultResume.resumeName,
            fileType: defaultResume.fileType,
            fileSize: defaultResume.fileSize,
            updatedAt: defaultResume.updatedAt,
            isDownloaded: access.unlocked,
          }
        : null,
      videoResume: videoUrl
        ? {
            url: videoUrl,
            status: videoProfileStatus,
          }
        : null,
      // Access state for the frontend: whether this candidate is unlocked, whether
      // contact/message features are available on the plan, and whether the profile_access
      // limit blocked an unlock (drives the "upgrade" modal on the candidate search page).
      access: {
        unlocked: access.unlocked,
        contactVisible: access.contactVisible,
        canViewContact: access.canViewContact,
        canMessage: access.canMessage,
        contactLocked: !access.contactVisible,
        limitReached: access.limitReached,
      },
    };
  }

  /**
   * Resolves profile-access state for an employer viewing a candidate.
   *
   * - Applicants (candidate applied to this employer's company) are always unlocked with full
   *   contact + message — no credit charged.
   * - Search-sourced candidates: if not already unlocked, atomically spend one profile_access
   *   credit (when a credit is available) to unlock. When no credit is available the candidate
   *   stays locked (`limitReached`) and the frontend shows the upgrade modal.
   * - Contact (email/phone) is only revealed when the plan's `viewContactAllowed` flag is set
   *   AND the candidate is unlocked. `canMessage` follows the plan's `messageAllowed` flag.
   */
  private async resolveProfileAccess(
    employerId: string,
    userId: string,
    profileId: string,
    isApplicant: boolean,
  ): Promise<{
    unlocked: boolean;
    contactVisible: boolean;
    canViewContact: boolean;
    canMessage: boolean;
    limitReached: boolean;
  }> {
    if (isApplicant) {
      return {
        unlocked: true,
        contactVisible: true,
        canViewContact: true,
        canMessage: true,
        limitReached: false,
      };
    }

    const subscription = await this.subscriptionHelper.getActiveSubscription(employerId);
    const planFlags = await this.getPlanFlags(subscription?.planId ?? null);

    let unlocked = await this.hasPaidProfileAccess(userId, profileId);
    let limitReached = false;

    if (!unlocked) {
      if (subscription) {
        // Atomic increment only succeeds while used < limit; marker is written only when charged.
        const charged = await this.subscriptionHelper.incrementUsage(
          subscription.id,
          'profile_access',
        );
        if (charged) {
          await this.db.insert(profileViews).values({ profileId, employerId: userId });
          unlocked = true;
        } else {
          limitReached = true;
        }
      } else {
        limitReached = true;
      }
    }

    const canViewContact = planFlags.viewContactAllowed;
    return {
      unlocked,
      contactVisible: unlocked && canViewContact,
      canViewContact,
      canMessage: planFlags.messageAllowed,
      limitReached,
    };
  }

  /**
   * Profile-access quota + plan capabilities for the candidate search "View Profile" pre-check.
   */
  async getProfileAccessSummary(userId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true, profileAccessNoticeAck: true },
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const subscription = await this.subscriptionHelper.getActiveSubscription(employer.id);
    const flags = await this.getPlanFlags(subscription?.planId ?? null);

    const limit = subscription?.profileAccessLimit ?? 0;
    const used = subscription?.profileAccessUsed ?? 0;

    return {
      data: {
        limit,
        used,
        remaining: Math.max(limit - used, 0),
        hasActiveSubscription: !!subscription,
        viewContactAllowed: flags.viewContactAllowed,
        messageAllowed: flags.messageAllowed,
        // Whether the employer has dismissed the one-time "profile credit" explainer modal.
        creditNoticeAcknowledged: !!employer.profileAccessNoticeAck,
      },
    };
  }

  /** Marks the one-time "profile credit" explainer modal as acknowledged for this employer. */
  async acknowledgeProfileAccessNotice(userId: string) {
    const result = await this.db
      .update(employers)
      .set({ profileAccessNoticeAck: true, updatedAt: new Date() })
      .where(eq(employers.userId, userId))
      .returning({ id: employers.id });

    if (!result.length) throw new ForbiddenException('Employer profile required');
    return { data: { creditNoticeAcknowledged: true } };
  }

  /** Plan capability flags (contact/message) for a subscription's plan; both false when none. */
  private async getPlanFlags(
    planId: string | null,
  ): Promise<{ viewContactAllowed: boolean; messageAllowed: boolean }> {
    if (!planId) return { viewContactAllowed: false, messageAllowed: false };
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
      columns: { viewContactAllowed: true, messageAllowed: true },
    });
    return {
      viewContactAllowed: !!plan?.viewContactAllowed,
      messageAllowed: !!plan?.messageAllowed,
    };
  }

  /**
   * Charged resume download. First download of a candidate consumes one
   * profile_access credit (tracked via profile_views per employer user + candidate);
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

    const alreadyPaid = await this.hasPaidProfileAccess(userId, candidateProfile.id);
    if (!alreadyPaid) {
      const subscription = await this.subscriptionHelper.getActiveSubscription(employer.id);
      if (!subscription) {
        throw new ForbiddenException(
          'No active subscription found. Please subscribe to a plan to access candidate resumes.',
        );
      }
      this.subscriptionHelper.checkLimit(subscription, 'profile_access');

      await this.db
        .insert(profileViews)
        .values({ profileId: candidateProfile.id, employerId: userId });
      await this.subscriptionHelper.incrementUsage(subscription.id, 'profile_access');
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
   * Whether this employer user already spent a profile_access credit on this candidate.
   * profile_views is the shared payment marker — also set by the application-based
   * profile endpoint, so a candidate is charged at most once per employer user.
   */
  private async hasPaidProfileAccess(userId: string, profileId: string): Promise<boolean> {
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
