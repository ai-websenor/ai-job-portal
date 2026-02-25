import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and } from 'drizzle-orm';
import { Database, jobApplications, employers, companies, profiles } from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateOfferDto } from './dto';

@Injectable()
export class OfferService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly sqsService: SqsService,
  ) {}

  async create(userId: string, dto: CreateOfferDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, dto.applicationId),
      with: { job: true },
    })) as any;

    if (!application || application.job.employerId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    // Store offer details in notes and update status
    const offerDetails = JSON.stringify({
      salary: dto.salary,
      currency: dto.currency || 'INR',
      joiningDate: dto.joiningDate,
      expiresAt: dto.expiresAt,
      additionalBenefits: dto.additionalBenefits,
      offerLetterUrl: dto.offerLetterUrl,
      offeredAt: new Date().toISOString(),
    });

    // Update application with offer status
    const [updated] = await this.db
      .update(jobApplications)
      .set({
        status: 'shortlisted' as any, // Stage before formal offer acceptance
        notes: offerDetails,
        updatedAt: new Date(),
      })
      .where(eq(jobApplications.id, dto.applicationId))
      .returning();

    // Notify candidate about the offer (non-blocking)
    let companyName = 'the company';
    if (employer.companyId) {
      const company = await this.db.query.companies.findFirst({
        where: eq(companies.id, employer.companyId),
      });
      companyName = company?.name || companyName;
    }

    this.sqsService
      .sendOfferExtendedNotification({
        userId: application.jobSeekerId,
        applicationId: dto.applicationId,
        jobTitle: application.job.title,
        companyName,
        salary: dto.salary?.toString(),
        joiningDate: dto.joiningDate,
      })
      .catch((err) =>
        this.logger.error(`Failed to send notification: ${err.message}`, 'OfferService'),
      );

    return {
      applicationId: updated.id,
      status: 'offer_sent',
      offerDetails: JSON.parse(offerDetails),
    };
  }

  async getById(applicationId: string) {
    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: {
        job: { with: { employer: true } },
        jobSeeker: true,
      },
    })) as any;
    if (!application) throw new NotFoundException('Application not found');

    const offerDetails = application.notes ? JSON.parse(application.notes) : null;
    return { ...application, offerDetails };
  }

  async accept(userId: string, applicationId: string) {
    const application = (await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, applicationId), eq(jobApplications.jobSeekerId, userId)),
      with: { job: { with: { employer: true } } },
    })) as any;

    if (!application) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(jobApplications)
      .set({ status: 'offer_accepted' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Notify employer about acceptance (non-blocking)
    if (application.job?.employer?.userId) {
      const profile = await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
      });
      this.sqsService
        .sendOfferAcceptedNotification({
          employerId: application.job.employer.userId,
          applicationId,
          jobTitle: application.job.title,
          candidateName: profile ? `${profile.firstName} ${profile.lastName}` : 'The candidate',
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification: ${err.message}`, 'OfferService'),
        );
    }

    return { message: 'Offer accepted' };
  }

  async decline(userId: string, applicationId: string, reason?: string) {
    const application = (await this.db.query.jobApplications.findFirst({
      where: and(eq(jobApplications.id, applicationId), eq(jobApplications.jobSeekerId, userId)),
      with: { job: { with: { employer: true } } },
    })) as any;

    if (!application) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(jobApplications)
      .set({ status: 'offer_rejected' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Notify employer about decline (non-blocking)
    if (application.job?.employer?.userId) {
      const profile = await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
      });
      this.sqsService
        .sendOfferDeclinedNotification({
          employerId: application.job.employer.userId,
          applicationId,
          jobTitle: application.job.title,
          candidateName: profile ? `${profile.firstName} ${profile.lastName}` : 'The candidate',
          reason,
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification: ${err.message}`, 'OfferService'),
        );
    }

    return { message: 'Offer declined' };
  }

  async withdraw(userId: string, applicationId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Access denied');

    const application = (await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    })) as any;

    if (!application || application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db
      .update(jobApplications)
      .set({ status: 'shortlisted' as any, notes: null, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    // Notify candidate about offer withdrawal (non-blocking)
    let companyName = 'the company';
    if (employer.companyId) {
      const company = await this.db.query.companies.findFirst({
        where: eq(companies.id, employer.companyId),
      });
      companyName = company?.name || companyName;
    }

    this.sqsService
      .sendOfferWithdrawnNotification({
        userId: application.jobSeekerId,
        applicationId,
        jobTitle: application.job.title,
        companyName,
      })
      .catch((err) =>
        this.logger.error(`Failed to send notification: ${err.message}`, 'OfferService'),
      );

    return { message: 'Offer withdrawn' };
  }
}
