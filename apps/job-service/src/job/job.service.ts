import { Inject, Injectable, BadRequestException } from '@nestjs/common';
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

  async create(createJobDto: CreateJobDto, user: any) {
    const userId = user.id;
    const userEmail = user.email;

    // 1. Fetch the employer profile using the authenticated userId
    let [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, userId))
      .limit(1);

    // 1.5 Fallback: If not found by ID, try finding by email
    if (!employer && userEmail) {
      console.warn(`[JobService.create] Employer not found by ID ${userId}. Attempting lookup by email: ${userEmail}`);

      // Step A: Find the user record directly by email
      const [userRecord] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, userEmail))
        .limit(1);

      console.log(`[JobService.create] User lookup by email '${userEmail}' result:`, userRecord);

      if (userRecord) {
        // Step B: Find the employer record using the correct User ID from the DB
        const [employerRecord] = await this.db
          .select()
          .from(schema.employers)
          .where(eq(schema.employers.userId, userRecord.id))
          .limit(1);

        console.log(`[JobService.create] Employer lookup by DB User ID '${userRecord.id}' result:`, employerRecord);

        if (employerRecord) {
          employer = employerRecord;
        }
      } else {
        console.warn(`[JobService.create] No user found for email '${userEmail}' in the database.`);
      }
    }

    console.log(`[JobService.create] Employer lookup result:`, employer); // Temporary debug log

    // 2. Throw error if employer profile not found
    if (!employer) {
      throw new BadRequestException(`Employer profile not found. Please ensure you are logged in as an employer.`);
    }

    const jobData = {
      ...createJobDto,
      employerId: employer.id, // 3. Use the resolved employer ID
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
