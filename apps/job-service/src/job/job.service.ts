import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import {
  Database,
  jobs,
  jobSkills,
  jobViews,
  savedJobs,
  employerProfiles,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CreateJobDto, UpdateJobDto } from './dto';

@Injectable()
export class JobService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const slug = `${dto.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const [job] = await this.db.insert(jobs).values({
      employerProfileId: employer.id,
      categoryId: dto.categoryId,
      title: dto.title,
      slug,
      description: dto.description,
      requirements: dto.requirements,
      responsibilities: dto.responsibilities,
      benefits: dto.benefits,
      employmentType: dto.employmentType as any,
      workMode: dto.workMode as any,
      experienceLevel: dto.experienceLevel as any,
      experienceMin: dto.experienceMin,
      experienceMax: dto.experienceMax,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency || 'INR',
      showSalary: dto.showSalary ?? true,
      locationCity: dto.locationCity,
      locationState: dto.locationState,
      locationCountry: dto.locationCountry,
      status: 'draft',
    } as any).returning();

    // Add skills
    if (dto.skillIds?.length) {
      await this.db.insert(jobSkills).values(
        dto.skillIds.map((skillId) => ({
          jobId: job.id,
          skillId,
          isRequired: true,
        })),
      );
    }

    return job;
  }

  async findById(id: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        employerProfile: true,
        category: true,
        skills: { with: { skill: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async findBySlug(slug: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.slug, slug),
      with: {
        employerProfile: true,
        category: true,
        skills: true,
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(userId: string, jobId: string, dto: UpdateJobDto) {
    const job = await this.verifyOwnership(userId, jobId);

    const updateData: any = { ...dto, updatedAt: new Date() };
    await this.db.update(jobs)
      .set(updateData)
      .where(eq(jobs.id, jobId));

    // Invalidate cache
    await this.redis.del(`job:${jobId}`);

    return this.findById(jobId);
  }

  async publish(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);

    await this.db.update(jobs)
      .set({
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .where(eq(jobs.id, jobId));

    return { message: 'Job published successfully' };
  }

  async close(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);

    await this.db.update(jobs)
      .set({ status: 'closed', closedAt: new Date() })
      .where(eq(jobs.id, jobId));

    return { message: 'Job closed' };
  }

  async delete(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);
    await this.db.delete(jobs).where(eq(jobs.id, jobId));
    return { message: 'Job deleted' };
  }

  async getEmployerJobs(userId: string, status?: string) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const conditions = [eq(jobs.employerProfileId, employer.id)];
    if (status) conditions.push(eq(jobs.status, status as any));

    return this.db.query.jobs.findMany({
      where: and(...conditions),
      orderBy: [desc(jobs.createdAt)],
      with: { category: true },
    });
  }

  async recordView(jobId: string, userId?: string, ip?: string) {
    await this.db.insert(jobViews).values({
      jobId,
      userId,
      ipAddress: ip,
    });

    await this.db.update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));
  }

  async saveJob(userId: string, jobId: string) {
    const existing = await this.db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)),
    });
    if (existing) return { message: 'Already saved' };

    await this.db.insert(savedJobs).values({ userId, jobId });
    return { message: 'Job saved' };
  }

  async unsaveJob(userId: string, jobId: string) {
    await this.db.delete(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
    return { message: 'Job unsaved' };
  }

  async getSavedJobs(userId: string) {
    return this.db.query.savedJobs.findMany({
      where: eq(savedJobs.userId, userId),
      with: { job: { with: { employerProfile: true } } },
    });
  }

  private async verifyOwnership(userId: string, jobId: string) {
    const employer = await this.db.query.employerProfiles.findFirst({
      where: eq(employerProfiles.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerProfileId, employer.id)),
    });
    if (!job) throw new NotFoundException('Job not found or access denied');

    return job;
  }
}
