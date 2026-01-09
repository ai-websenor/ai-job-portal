/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

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
      // Step A: Find the user record directly by email
      const [userRecord] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, userEmail))
        .limit(1);

      if (userRecord) {
        // Step B: Find the employer record using the correct User ID from the DB
        const [employerRecord] = await this.db
          .select()
          .from(schema.employers)
          .where(eq(schema.employers.userId, userRecord.id))
          .limit(1);

        if (employerRecord) {
          employer = employerRecord;
        }
      } else {
        console.warn(
          `[JobService.create] No user found for email '${userEmail}' in the database.`,
        );
      }
    }

    console.log(`[JobService.create] Employer lookup result:`, employer); // Temporary debug log

    // 2. Throw error if employer profile not found
    if (!employer) {
      throw new BadRequestException(
        `Employer profile not found. Please ensure you are logged in as an employer.`,
      );
    }

    const { applicationDeadline: deadline, ...restJobData } = createJobDto;

    const jobData = {
      ...restJobData,
      deadline: deadline ? new Date(deadline) : null,
      employerId: employer.id,
      status: 'OPEN',
    };

    const [job] = await this.db
      .insert(schema.jobs)
      .values(jobData as any)
      .returning();
    return {
      message: 'Job created successfully',
      ...job,
    };
  }

  async findAll(query: any) {
    // Basic implementation
    const limit = query.limit || 10;
    const offset = (query.page - 1) * limit || 0;

    // Fetch jobs with company name by joining with employers table
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(schema.jobs.createdAt);

    const count = await this.db
      .select({ count: schema.jobs.id })
      .from(schema.jobs)
      .then((res) => res.length); // Simplified count

    return {
      message:
        jobs.length > 0 ? 'Jobs retrieved successfully' : 'No jobs found',
      jobs,
      total: count,
    };
  }

  async findOne(id: string) {
    const [job] = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .where(eq(schema.jobs.id, id))
      .limit(1);

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return {
      message: 'Job retrieved successfully',
      ...job,
    };
  }

  async findMyJobs(user: any, query: any) {
    // Get employer profile for the authenticated user
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    const limit = query.limit || 10;
    const offset = (query.page - 1) * limit || 0;

    // Fetch jobs created by this employer with company name
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .where(eq(schema.jobs.employerId, employer.id))
      .limit(limit)
      .offset(offset)
      .orderBy(schema.jobs.createdAt);

    const [countResult] = await this.db
      .select({ count: schema.jobs.id })
      .from(schema.jobs)
      .where(eq(schema.jobs.employerId, employer.id));

    const total = countResult ? Number(countResult.count) : 0;

    return {
      message:
        jobs.length > 0 ? 'Jobs retrieved successfully' : 'No jobs found',
      jobs,
      total,
    };
  }

  async findMyJobById(id: string, user: any) {
    // Get employer profile for the authenticated user
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    // Fetch the specific job with company name
    const [job] = await this.db
      .select({
        id: schema.jobs.id,
        employerId: schema.jobs.employerId,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        isFeatured: schema.jobs.isFeatured,
        isHighlighted: schema.jobs.isHighlighted,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        company_name: schema.employers.companyName,
      })
      .from(schema.jobs)
      .innerJoin(
        schema.employers,
        eq(schema.jobs.employerId, schema.employers.id),
      )
      .where(
        and(eq(schema.jobs.id, id), eq(schema.jobs.employerId, employer.id)),
      )
      .limit(1);

    if (!job) {
      throw new NotFoundException(
        `Job with ID ${id} not found or you don't have permission to view it`,
      );
    }

    return {
      message: 'Job retrieved successfully',
      ...job,
    };
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: any) {
    // 1. Check if job exists and get employer ID
    const job = await this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, id),
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // 2. Get employer profile for the authenticated user
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    // 3. Check ownership
    if (job.employerId !== employer.id) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    // 4. Perform update
    const { applicationDeadline: deadline, ...restUpdateData } = updateJobDto;

    const updateData = {
      ...restUpdateData,
      ...(deadline && { deadline: new Date(deadline) }),
      updatedAt: new Date(),
    };

    const [updatedJob] = await this.db
      .update(schema.jobs)
      .set(updateData)
      .where(eq(schema.jobs.id, id))
      .returning();

    return {
      message: 'Job updated successfully',
      ...updatedJob,
    };
  }

  async remove(id: string, user: any) {
    // 1. Check if job exists and get employer ID
    const job = await this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, id),
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // 2. Get employer profile for the authenticated user
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new BadRequestException('Employer profile not found');
    }

    // 3. Check ownership
    if (job.employerId !== employer.id) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    // 4. Perform delete
    const [deletedJob] = await this.db
      .delete(schema.jobs)
      .where(eq(schema.jobs.id, id))
      .returning();

    return {
      message: 'Job deleted successfully',
      ...deletedJob,
    };
  }

  async saveJob(jobId: string, user: any) {
    // 1. Validate that the job exists and is active
    const job = await this.db.query.jobs.findFirst({
      where: eq(schema.jobs.id, jobId),
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (!job.isActive) {
      throw new BadRequestException(
        'This job is no longer active and cannot be saved',
      );
    }

    // 2. Check if user has already applied to this job
    const [existingApplication] = await this.db
      .select()
      .from(schema.jobApplications)
      .where(
        and(
          eq(schema.jobApplications.jobId, jobId),
          eq(schema.jobApplications.jobSeekerId, user.id),
        ),
      )
      .limit(1);

    if (existingApplication) {
      throw new ConflictException(
        'You have already applied to this job. No need to save it.',
      );
    }

    // 3. Check if user has already saved this job
    const [existingSave] = await this.db
      .select()
      .from(schema.savedJobs)
      .where(
        and(
          eq(schema.savedJobs.jobId, jobId),
          eq(schema.savedJobs.jobSeekerId, user.id),
        ),
      )
      .limit(1);

    if (existingSave) {
      throw new ConflictException('You have already saved this job');
    }

    // 4. Insert saved job record
    const [savedJob] = await this.db
      .insert(schema.savedJobs)
      .values({
        jobId: jobId,
        jobSeekerId: user.id,
      } as any)
      .returning();

    return {
      message: 'Job saved successfully',
      savedJob,
    };
  }

  async getSavedJobs(user: any) {
    // Get all saved jobs for the authenticated candidate with job details
    const savedJobs = await this.db
      .select({
        savedJobId: schema.savedJobs.id,
        savedAt: schema.savedJobs.createdAt,
        job: {
          id: schema.jobs.id,
          title: schema.jobs.title,
          description: schema.jobs.description,
          jobType: schema.jobs.jobType,
          workType: schema.jobs.workType,
          experienceLevel: schema.jobs.experienceLevel,
          location: schema.jobs.location,
          city: schema.jobs.city,
          state: schema.jobs.state,
          salaryMin: schema.jobs.salaryMin,
          salaryMax: schema.jobs.salaryMax,
          payRate: schema.jobs.payRate,
          skills: schema.jobs.skills,
          isActive: schema.jobs.isActive,
          applicationCount: schema.jobs.applicationCount,
          createdAt: schema.jobs.createdAt,
        },
      })
      .from(schema.savedJobs)
      .innerJoin(schema.jobs, eq(schema.savedJobs.jobId, schema.jobs.id))
      .where(eq(schema.savedJobs.jobSeekerId, user.id))
      .orderBy(schema.savedJobs.createdAt);

    return {
      message:
        savedJobs.length > 0
          ? 'Saved jobs retrieved successfully'
          : 'No saved jobs found',
      count: savedJobs.length,
      savedJobs,
    };
  }
}
