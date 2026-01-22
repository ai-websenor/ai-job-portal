import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { Database, jobs, jobViews, savedJobs, employers } from '@ai-job-portal/database';
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
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const [job] = await this.db
      .insert(jobs)
      .values({
        employerId: employer.id,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        jobType: dto.jobType || 'full_time',
        employmentType: dto.employmentType,
        workMode: dto.workMode as any,
        experienceLevel: dto.experienceLevel,
        experienceMin: dto.experienceMin,
        experienceMax: dto.experienceMax,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        showSalary: dto.showSalary ?? true,
        location: dto.location || '',
        city: dto.city,
        state: dto.state,
        country: dto.country,
        skills: dto.skills || [],
        benefits: dto.benefits,
        isActive: false, // Draft state
      } as any)
      .returning();

    return job;
  }

  async findById(id: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        employer: true,
        category: true,
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(userId: string, jobId: string, dto: UpdateJobDto) {
    const _job = await this.verifyOwnership(userId, jobId);

    const updateData: any = { ...dto, updatedAt: new Date() };
    await this.db.update(jobs).set(updateData).where(eq(jobs.id, jobId));

    // Invalidate cache
    await this.redis.del(`job:${jobId}`);

    return this.findById(jobId);
  }

  async publish(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);

    await this.db
      .update(jobs)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));

    return { message: 'Job published successfully' };
  }

  async close(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);

    await this.db
      .update(jobs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    return { message: 'Job closed' };
  }

  async delete(userId: string, jobId: string) {
    await this.verifyOwnership(userId, jobId);
    await this.db.delete(jobs).where(eq(jobs.id, jobId));
    return { message: 'Job deleted' };
  }

  async getEmployerJobs(userId: string, active?: boolean) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const conditions = [eq(jobs.employerId, employer.id)];
    if (active !== undefined) conditions.push(eq(jobs.isActive, active));

    return this.db.query.jobs.findMany({
      where: and(...conditions),
      orderBy: [desc(jobs.createdAt)],
      with: { category: true },
    });
  }

  async recordView(jobId: string, userId?: string, ip?: string) {
    // Validate UUID format to prevent errors from routing mismatches
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return; // Silently skip if not a valid UUID
    }

    if (userId) {
      await this.db.insert(jobViews).values({
        jobId,
        userId,
        ipAddress: ip,
      });
    }

    await this.db
      .update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));
  }

  async saveJob(userId: string, jobId: string) {
    const existing = await this.db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, jobId)),
    });
    if (existing) return { message: 'Already saved' };

    await this.db.insert(savedJobs).values({ jobSeekerId: userId, jobId });
    return { message: 'Job saved' };
  }

  async unsaveJob(userId: string, jobId: string) {
    await this.db
      .delete(savedJobs)
      .where(and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, jobId)));
    return { message: 'Job unsaved' };
  }

  async getSavedJobs(userId: string) {
    return this.db.query.savedJobs.findMany({
      where: eq(savedJobs.jobSeekerId, userId),
      with: { job: { with: { employer: true } } },
    });
  }

  private async verifyOwnership(userId: string, jobId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerId, employer.id)),
    });
    if (!job) throw new NotFoundException('Job not found or access denied');

    return job;
  }
}
