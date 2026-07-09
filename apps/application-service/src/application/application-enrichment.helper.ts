import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  profiles,
  employers,
  companies,
  resumes,
  messageThreads,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { hasCompanyPermission } from '@ai-job-portal/common';

@Injectable()
export class ApplicationEnrichmentHelper {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Get candidate profile for a specific application
   * Only accessible by employer who owns the job linked to the application
   */
  async getCandidateProfileForApplication(
    userId: string,
    applicationId: string,
    userRole?: string,
  ) {
    // Step 1: Find employer record for this user
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Step 2: Validate application exists — include job.companyId for authoritative company check
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    })) as any;

    if (!application) throw new NotFoundException('Application not found');

    // Step 3: Verify the candidate has applied to a job in this employer's company
    // Primary check: employer directly owns the job
    // Secondary check: employer belongs to the same company AND has company-applications:read permission
    const jobCompanyId = application.job?.companyId;
    const isDirectOwner = application.job?.employerId === employer.id;
    const isSameCompany = employer.companyId && jobCompanyId && jobCompanyId === employer.companyId;

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

    // This endpoint is only reachable via an application, so the candidate has applied
    // to this employer's job — viewing their profile is always free, no profile_access
    // credit charged and no subscription required. Paid access only applies to the
    // candidate-search flow (user-service).

    // Fetch full candidate profile with related data
    const candidateProfile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, application.jobSeekerId),
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

    if (!candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    // Step 6: Get public URL for profile photo if exists
    const profilePhotoUrl = this.s3Service.getPublicUrlFromKeyOrUrl(
      candidateProfile.profilePhoto || null,
    );

    // Step 6b: Build video resume from profiles.videoResumeUrl
    // Video is stored directly on the profile (not in the videoResumes table)
    // Only show if status is approved (not rejected/pending) — signed URL avoids AccessDenied
    const videoProfileStatus = candidateProfile.videoProfileStatus;
    const isVideoApproved = videoProfileStatus === 'approved';
    const videoUrl =
      isVideoApproved && candidateProfile.videoResumeUrl
        ? await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(candidateProfile.videoResumeUrl)
        : null;

    // Build response - similar structure to GET /candidates/profile
    // but with resumeUrl from job_applications
    return {
      profile: {
        userId: application.jobSeekerId,
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
      application: {
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
        threadId: await this.getThreadId(userId, application.jobSeekerId, application.id),
      },
      videoResume: videoUrl
        ? {
            // Pre-signed URL (1 hour) — avoids AccessDenied on private S3 bucket
            url: videoUrl,
            status: videoProfileStatus,
          }
        : null,
    };
  }

  /**
   * Looks up an existing message thread between two users for a specific application.
   */
  async getThreadId(
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

  async getCompanyName(companyId?: string | null): Promise<string> {
    if (!companyId) return 'the company';
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    return company?.name || 'the company';
  }
}
