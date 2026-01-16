import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import {
  Database,
  offers,
  applications,
  jobs,
  employerProfiles,
  candidateProfiles,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateOfferDto } from './dto';

@Injectable()
export class OfferService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(userId: string, dto: CreateOfferDto) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const application = await this.db.query.applications.findFirst({
      where: eq(applications.id, dto.applicationId),
      with: { job: true },
    }) as any;

    if (!application || application.job.employerProfileId !== employer.id) {
      throw new NotFoundException('Application not found');
    }

    const [offer] = await this.db.insert(offers).values({
      applicationId: dto.applicationId,
      salary: dto.salary,
      currency: dto.currency || 'INR',
      joiningDate: new Date(dto.joiningDate),
      expiresAt: new Date(dto.expiresAt),
      additionalBenefits: dto.additionalBenefits,
      offerLetterUrl: dto.offerLetterUrl,
    }).returning();

    // Update application status
    await this.db.update(applications)
      .set({ status: 'offered' })
      .where(eq(applications.id, dto.applicationId));

    return offer;
  }

  async getById(id: string) {
    const offer = await this.db.query.offers.findFirst({
      where: eq(offers.id, id),
      with: {
        application: {
          with: { job: { with: { employerProfile: true } }, candidateProfile: true },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async accept(userId: string, offerId: string) {
    const offer = await this.getById(offerId) as any;

    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });

    if (!candidate || offer.application.candidateProfileId !== candidate.id) {
      throw new ForbiddenException('Access denied');
    }

    if (offer.status !== 'pending') {
      throw new ForbiddenException('Offer is no longer valid');
    }

    await this.db.update(offers)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(eq(offers.id, offerId));

    await this.db.update(applications)
      .set({ status: 'hired' })
      .where(eq(applications.id, offer.applicationId));

    return { message: 'Offer accepted' };
  }

  async decline(userId: string, offerId: string, reason?: string) {
    const offer = await this.getById(offerId) as any;

    const candidate = await this.db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, userId),
    });

    if (!candidate || offer.application.candidateProfileId !== candidate.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(offers)
      .set({ status: 'declined', respondedAt: new Date() })
      .where(eq(offers.id, offerId));

    await this.db.update(applications)
      .set({ status: 'rejected' })
      .where(eq(applications.id, offer.applicationId));

    return { message: 'Offer declined' };
  }

  async withdraw(userId: string, offerId: string) {
    const offer = await this.getById(offerId) as any;

    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });

    if (!employer || offer.application.job.employerProfileId !== employer.id) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.update(offers)
      .set({ status: 'withdrawn' })
      .where(eq(offers.id, offerId));

    return { message: 'Offer withdrawn' };
  }
}
