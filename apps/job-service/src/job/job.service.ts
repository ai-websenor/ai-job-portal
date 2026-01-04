import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase<typeof schema>,
  ) { }

  async create(createJobDto: CreateJobDto, employerId: string) {
    const jobData = {
      ...createJobDto,
      employerId,
      status: 'OPEN', // Default status
    };
    const [job] = await this.db.insert(schema.jobs).values(jobData as any).returning();
    return job;
  }

  async findAll(query: any) {
    // Basic implementation
    const limit = query.limit || 10;
    const offset = (query.page - 1) * limit || 0;

    // Add filtering logic here
    const jobs = await this.db.query.jobs.findMany({
      limit: limit,
      offset: offset,
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    });

    const count = await this.db.select({ count: schema.jobs.id }).from(schema.jobs).then(res => res.length); // Simplified count

    return { jobs, total: count };
  }

  async findOne(id: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, id),
    });
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    const [updatedJob] = await this.db.update(schema.jobs)
      .set({ ...updateJobDto, updatedAt: new Date() } as any)
      .where(eq(schema.jobs.id, id))
      .returning();
    return updatedJob;
  }

  async remove(id: string) {
    const [deletedJob] = await this.db.delete(schema.jobs)
      .where(eq(schema.jobs.id, id))
      .returning();
    return deletedJob;
  }
}
