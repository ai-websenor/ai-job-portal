import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import {
  Database,
  jobApplications,
  jobs,
  employers,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateOfferDto } from './dto';

@Injectable()
export class OfferService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(userId: string, dto: CreateOfferDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, dto.applicationId),
      with: { job: true },
    }) as any;

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
    const [updated] = await this.db.update(jobApplications)
      .set({
        status: 'shortlisted' as any, // Stage before formal offer acceptance
        notes: offerDetails,
        updatedAt: new Date(),
      })
      .where(eq(jobApplications.id, dto.applicationId))
      .returning();

    return {
      applicationId: updated.id,
      status: 'offer_sent',
      offerDetails: JSON.parse(offerDetails),
    };
  }

  async getById(applicationId: string) {
    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: {
        job: { with: { employer: true } },
        jobSeeker: true,
      },
    }) as any;
    if (!application) throw new NotFoundException('Application not found');

    const offerDetails = application.notes ? JSON.parse(application.notes) : null;
    return { ...application, offerDetails };
  }

  async accept(userId: string, applicationId: string) {
    const application = await this.db.query.jobApplications.findFirst({
      where: and(
        eq(jobApplications.id, applicationId),
        eq(jobApplications.jobSeekerId, userId),
      ),
    }) as any;

    if (!application) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(jobApplications)
      .set({ status: 'offer_accepted' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    return { message: 'Offer accepted' };
  }

  async decline(userId: string, applicationId: string, reason?: string) {
    const application = await this.db.query.jobApplications.findFirst({
      where: and(
        eq(jobApplications.id, applicationId),
        eq(jobApplications.jobSeekerId, userId),
      ),
    }) as any;

    if (!application) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(jobApplications)
      .set({ status: 'offer_rejected' as any, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    return { message: 'Offer declined' };
  }

  async withdraw(userId: string, applicationId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Access denied');

    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
      with: { job: true },
    }) as any;

    if (!application || application.job.employerId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(jobApplications)
      .set({ status: 'shortlisted' as any, notes: null, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId));

    return { message: 'Offer withdrawn' };
  }
}
