import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { eq, and } from 'drizzle-orm';
import Redis from 'ioredis';
import {
  Database,
  jobs,
  employers,
  jobApplications,
  savedJobs,
  jobCategories,
  companies,
} from '@ai-job-portal/database';
import { SqsService } from '@ai-job-portal/aws';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CreateJobDto, UpdateJobDto, OTHER_CATEGORY_VALUE } from './dto';
import { SearchJobsDto } from '../search/dto';
import { SubscriptionHelper } from '../subscription/subscription.helper';
import { sanitizeRichText } from '../utils/html-sanitizer';
import { employerPublicColumns } from './job-columns.const';
import { EmployerJobService } from './employer-job.service';
import { SavedJobService } from './saved-job.service';

@Injectable()
export class JobService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly sqsService: SqsService,
    private readonly subscriptionHelper: SubscriptionHelper,
    private readonly employerJobService: EmployerJobService,
    private readonly savedJobService: SavedJobService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    // Fetch employer profile
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      with: {
        user: true,
      },
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Validate category hierarchy
    await this.validateCategoryHierarchy(dto);

    // Convert "other" values to null for database storage
    const categoryId = dto.categoryId === OTHER_CATEGORY_VALUE ? null : dto.categoryId;
    const subCategoryId = dto.subCategoryId === OTHER_CATEGORY_VALUE ? null : dto.subCategoryId;

    // Jobs are created as drafts (isActive: false) — employer must publish separately
    const [job] = await this.db
      .insert(jobs)
      .values({
        employerId: employer.id,
        companyId: employer.companyId,
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        customCategory: dto.customCategory,
        customSubCategory: dto.customSubCategory,
        clientName: dto.clientName,
        title: dto.title,
        description: sanitizeRichText(dto.description),
        jobType: dto.jobType,
        workMode: dto.workMode as any,
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
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        validityDays: dto.validityDays ?? null,
        immigrationStatus: dto.immigrationStatus,
        payRate: dto.payRate,
        travelRequirements: dto.travelRequirements,
        qualification: dto.qualification,
        certification: dto.certification,
        isFeatured: dto.isFeatured ?? false,
        isHighlighted: dto.isHighlighted ?? false,
        isActive: false,
      } as any)
      .returning();

    return job;
  }

  /**
   * Validates the category hierarchy:
   * 1. categoryId must be a parent category (parentId = null) if provided
   * 2. subCategoryId must belong to the selected categoryId if provided
   * 3. customCategory required if categoryId = "other"
   * 4. customSubCategory required if subCategoryId = "other"
   */
  private async validateCategoryHierarchy(dto: CreateJobDto): Promise<void> {
    // Case 1: "Other" category selected - customCategory required
    if (dto.categoryId === OTHER_CATEGORY_VALUE) {
      if (!dto.customCategory?.trim()) {
        throw new BadRequestException('Custom category name is required when selecting "Other"');
      }
      // subCategoryId and customSubCategory are optional with "Other" category
      return;
    }

    // Case 2: Standard category selected
    if (dto.categoryId) {
      const category = await this.db.query.jobCategories.findFirst({
        where: eq(jobCategories.id, dto.categoryId),
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }

      // Verify it's a parent category (parentId must be null)
      if (category.parentId !== null) {
        throw new BadRequestException(
          'Selected category must be a parent category (not a subcategory)',
        );
      }

      // Case 3: Validate subcategory if provided
      if (dto.subCategoryId && dto.subCategoryId !== OTHER_CATEGORY_VALUE) {
        const subCategory = await this.db.query.jobCategories.findFirst({
          where: eq(jobCategories.id, dto.subCategoryId),
        });

        if (!subCategory) {
          throw new BadRequestException('Subcategory not found');
        }

        // Verify subcategory belongs to selected category
        if (subCategory.parentId !== dto.categoryId) {
          throw new BadRequestException('Subcategory does not belong to the selected category');
        }
      }

      // Case 4: "Other" subcategory - customSubCategory required
      if (dto.subCategoryId === OTHER_CATEGORY_VALUE && !dto.customSubCategory?.trim()) {
        throw new BadRequestException('Custom subcategory name is required when selecting "Other"');
      }
    }

    // Case 5: No category but subcategory provided - invalid
    if (!dto.categoryId && (dto.subCategoryId || dto.customSubCategory)) {
      throw new BadRequestException('Cannot specify subcategory without a parent category');
    }
  }

  async findById(id: string, userId?: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        employer: { columns: employerPublicColumns },
        company: {
          columns: {
            id: true,
            name: true,
            logoUrl: true,
            bannerUrl: true,
            description: true,
            website: true,
            industry: true,
            tagline: true,
            headquarters: true,
            country: true,
            state: true,
            stateCode: true,
            city: true,
            address: true,
            pincode: true,
            billingEmail: true,
            billingPhone: true,
            benefits: true,
          },
        },
        category: true,
        subCategory: true,
        screeningQuestions: {
          orderBy: (q, { asc }) => [asc(q.order)],
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Targeted isSaved and isApplied check for single job
    let isSaved = false;
    let isApplied = false;
    let isAppliedAt: Date | null = null;
    let isWithdrawn = false;
    let reapplyDaysLeft: number | null = null;
    if (userId) {
      const [saved, application] = await Promise.all([
        this.db.query.savedJobs.findFirst({
          where: and(eq(savedJobs.jobSeekerId, userId), eq(savedJobs.jobId, id)),
        }),
        this.db.query.jobApplications.findFirst({
          where: and(eq(jobApplications.jobSeekerId, userId), eq(jobApplications.jobId, id)),
          columns: { appliedAt: true, status: true, updatedAt: true },
        }),
      ]);
      isSaved = !!saved;
      isWithdrawn = application?.status === 'withdrawn';
      isApplied = application ? !isWithdrawn : false;
      isAppliedAt = application?.appliedAt || null;

      if (isWithdrawn && application) {
        const withdrawnAt = new Date(application.updatedAt);
        const reapplyDate = new Date(withdrawnAt);
        reapplyDate.setDate(reapplyDate.getDate() + 60);
        const daysLeft = Math.ceil((reapplyDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        reapplyDaysLeft = daysLeft > 0 ? daysLeft : 0;
      }
    }

    // Return questions from screeningQuestions table (source of truth)
    // Ensure empty array instead of undefined/null
    return {
      ...job,
      questions: job.screeningQuestions || [],
      isSaved,
      isApplied,
      isAppliedAt,
      isWithdrawn,
      reapplyDaysLeft,
    };
  }

  async update(userId: string, jobId: string, dto: UpdateJobDto, userRole?: string) {
    const job = await this.verifyOwnership(userId, jobId, userRole);

    const updateData: any = { ...dto, updatedAt: new Date() };

    // Sanitize rich-text HTML before persistence (stored-XSS guard)
    if (dto.description !== undefined) {
      updateData.description = sanitizeRichText(dto.description);
    }

    // Convert deadline string to Date if provided
    if (dto.deadline !== undefined) {
      updateData.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }

    // Handle featured/highlighted credit changes for published (active) jobs
    if (job.isActive) {
      const featureToggles: {
        field: 'isFeatured' | 'isHighlighted';
        key: 'featured_job' | 'highlighted_job';
      }[] = [
        { field: 'isFeatured', key: 'featured_job' },
        { field: 'isHighlighted', key: 'highlighted_job' },
      ];

      for (const { field, key } of featureToggles) {
        if (dto[field] === undefined || dto[field] === job[field]) continue;

        // Resolve subscription (same logic as publish)
        let subscriptionEmployerId = job.employerId;
        const currentEmployer = await this.db.query.employers.findFirst({
          where: eq(employers.userId, userId),
          columns: { id: true },
        });
        if (currentEmployer && currentEmployer.id !== job.employerId) {
          subscriptionEmployerId = currentEmployer.id;
        }

        const subscription =
          await this.subscriptionHelper.getActiveSubscription(subscriptionEmployerId);

        if (dto[field] && !job[field]) {
          // Toggling ON — check limit and increment
          if (!subscription) {
            throw new ForbiddenException('No active subscription. Please upgrade your plan.');
          }
          this.subscriptionHelper.checkLimit(subscription, key);
          await this.subscriptionHelper.incrementUsage(subscription.id, key);
        } else if (!dto[field] && job[field]) {
          // Toggling OFF — return the credit
          if (subscription) {
            await this.subscriptionHelper.decrementUsage(subscription.id, key);
          }
        }
      }
    }

    await this.db.update(jobs).set(updateData).where(eq(jobs.id, jobId));

    // Invalidate job cache
    await this.redis.del(`job:${jobId}`);

    return this.findById(jobId);
  }

  async publish(userId: string, jobId: string, userRole?: string) {
    const job = await this.verifyOwnership(userId, jobId, userRole);

    if (job.isActive) {
      return { message: 'Job is already live', data: job };
    }

    // Resolve which employer's subscription to check:
    // If the current user is the job owner, use job.employerId.
    // If publishing another employer's job (company-level), use the current user's subscription.
    let subscriptionEmployerId = job.employerId;
    const currentEmployer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true },
    });
    if (currentEmployer && currentEmployer.id !== job.employerId) {
      subscriptionEmployerId = currentEmployer.id;
    }

    const subscription =
      await this.subscriptionHelper.getActiveSubscription(subscriptionEmployerId);
    if (!subscription) {
      throw new ForbiddenException(
        'Your plan has expired or you have no active subscription. Please upgrade your plan to publish jobs.',
      );
    }

    // Resuming a held job is not a new posting — it was already counted when
    // first published. Skip limit checks / credit usage so Hold→Publish can
    // toggle freely without draining subscription credits. Also keep its
    // original deadline (validity is locked at first publish).
    const wasHeld = job.status === 'hold';

    // Resolve plan validity (days). NULL = unlimited (no auto-expiry, 1 credit).
    const planValidityDays = await this.subscriptionHelper.getPlanValidityDays(
      (subscription as any).planId,
    );

    // Chosen validity defaults to the plan validity when the employer left it blank.
    const chosenValidityDays =
      job.validityDays && job.validityDays > 0 ? job.validityDays : planValidityDays;

    // Longer validity than one plan period costs extra posting credits (rounded up).
    // Unlimited plan (no validity) always costs a single credit.
    const jobPostCredits =
      planValidityDays && planValidityDays > 0 && chosenValidityDays
        ? Math.ceil(chosenValidityDays / planValidityDays)
        : 1;

    // Compute the job deadline from validity. Plan validity is the hard cap;
    // an employer-set Application Deadline can only shorten it (min wins).
    let computedDeadline: Date | null | undefined; // undefined = leave unchanged
    if (!wasHeld && planValidityDays && planValidityDays > 0 && chosenValidityDays) {
      const validityDeadline = new Date(Date.now() + chosenValidityDays * 24 * 60 * 60 * 1000);
      computedDeadline =
        job.deadline && new Date(job.deadline) < validityDeadline
          ? new Date(job.deadline)
          : validityDeadline;
    }

    // Check job posting limit (accounts for multi-credit validity upgrades)
    if (!wasHeld) {
      this.subscriptionHelper.checkLimitCount(subscription, 'job_post', jobPostCredits);

      // Check featured job credit limit if this is a featured job
      if (job.isFeatured) {
        this.subscriptionHelper.checkLimit(subscription, 'featured_job');
      }
    }

    // Publish the job — reset status to 'active' so a previously held job
    // returns to the active state (frontend Hold button reappears).
    const [updatedJob] = await this.db
      .update(jobs)
      .set({
        isActive: true,
        status: 'active',
        updatedAt: new Date(),
        ...(computedDeadline !== undefined ? { deadline: computedDeadline } : {}),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Increment usage only for genuinely new postings (not held-job resumes)
    if (!wasHeld) {
      // Increment job posting usage counter by the number of validity credits
      await this.subscriptionHelper.incrementUsageByCount(
        subscription.id,
        'job_post',
        jobPostCredits,
      );

      // Deduct featured job credit if this is a featured job
      if (job.isFeatured) {
        await this.subscriptionHelper.incrementUsage(subscription.id, 'featured_job');
      }
    }

    // Fire job-alert notification (non-blocking — must not fail the publish response)
    try {
      const company = updatedJob.companyId
        ? await this.db.query.companies.findFirst({
            where: eq(companies.id, updatedJob.companyId),
            columns: { name: true },
          })
        : null;

      await this.sqsService.sendJobPostedNotification({
        employerId: updatedJob.employerId,
        jobId: updatedJob.id,
        jobTitle: updatedJob.title,
        companyName: company?.name,
        location: updatedJob.location,
        city: updatedJob.city ?? undefined,
        state: updatedJob.state ?? undefined,
        skills: updatedJob.skills ?? undefined,
        categoryId: updatedJob.categoryId,
        jobType: updatedJob.jobType,
        workMode: updatedJob.workMode,
        salaryMin: updatedJob.salaryMin,
        salaryMax: updatedJob.salaryMax,
      });
    } catch (err: any) {
      this.logger.error(`Failed to queue job-alert notification: ${err.message}`);
    }

    return { message: 'Job is live now', data: updatedJob };
  }

  async close(userId: string, jobId: string, userRole?: string) {
    const job = await this.verifyOwnership(userId, jobId, userRole);

    if (!job.isActive) {
      return { message: 'Job already closed' };
    }

    await this.db
      .update(jobs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    return { message: 'Job closed' };
  }

  async updateStatus(
    userId: string,
    jobId: string,
    status: 'active' | 'inactive' | 'hold',
    userRole?: string,
  ) {
    await this.verifyOwnership(userId, jobId, userRole);

    // Keep isActive in sync with status so held/inactive jobs leave public search
    // and the frontend Hold/Publish toggle resolves correctly.
    const isActive = status === 'active';

    await this.db
      .update(jobs)
      .set({ status, isActive, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    // Invalidate job cache
    await this.redis.del(`job:${jobId}`);

    return { message: `Job status updated to ${status}` };
  }

  async delete(userId: string, jobId: string, userRole?: string) {
    // For delete, check company-jobs:delete permission
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // Check direct ownership first
    const ownJob = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerId, employer.id)),
    });

    if (!ownJob) {
      // Check company-level delete permission
      if (userRole && employer.companyId) {
        const companyJob = await this.db.query.jobs.findFirst({
          where: and(eq(jobs.id, jobId), eq(jobs.companyId, employer.companyId)),
        });
        if (!companyJob) throw new NotFoundException('Job not found or access denied');

        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole,
          'company-jobs:delete',
        );
        if (!hasPermission) throw new ForbiddenException('No permission to delete company jobs');
      } else {
        throw new NotFoundException('Job not found or access denied');
      }
    }
    try {
      await this.db.delete(jobs).where(eq(jobs.id, jobId));
    } catch (err: any) {
      // Foreign key violation (Postgres code 23503): job still referenced by
      // related records (message threads, applications, etc.)
      if (err?.code === '23503') {
        throw new ConflictException(
          'This job cannot be deleted because it has related activity such as candidate messages or applications. Close the job instead, or remove the related records first.',
        );
      }
      throw err;
    }

    return { message: 'Job deleted' };
  }

  async getEmployerJobs(
    userId: string,
    userRole: string,
    opts: {
      active?: boolean;
      search?: string;
      scope?: string;
      status?: string;
      categoryId?: string;
      createdBy?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return this.employerJobService.getEmployerJobs(userId, userRole, opts);
  }

  async getCompanyJobCreators(userId: string, userRole: string) {
    return this.employerJobService.getCompanyJobCreators(userId, userRole);
  }

  async recordView(jobId: string, userId?: string, ip?: string) {
    return this.savedJobService.recordView(jobId, userId, ip);
  }

  async saveJob(userId: string, jobId: string) {
    return this.savedJobService.saveJob(userId, jobId);
  }

  async unsaveJob(userId: string, jobId: string) {
    return this.savedJobService.unsaveJob(userId, jobId);
  }

  async getSavedJobs(userId: string, search?: string, fromDate?: string, toDate?: string) {
    return this.savedJobService.getSavedJobs(userId, search, fromDate, toDate);
  }

  async getRecommendedJobs(userId: string, dto: SearchJobsDto) {
    return this.savedJobService.getRecommendedJobs(userId, dto);
  }

  private async verifyOwnership(
    userId: string,
    jobId: string,
    userRole?: string,
    companyPermission: string = 'company-jobs:write',
  ) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    // First try direct ownership
    const job = await this.db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.employerId, employer.id)),
    });
    if (job) return job;

    // If not direct owner, check company-level permission
    if (userRole && employer.companyId) {
      const companyJob = await this.db.query.jobs.findFirst({
        where: and(eq(jobs.id, jobId), eq(jobs.companyId, employer.companyId)),
      });

      if (companyJob) {
        const hasPermission = await hasCompanyPermission(
          this.db,
          employer.rbacRoleId,
          userRole,
          companyPermission,
        );
        if (hasPermission) return companyJob;
      }
    }

    throw new NotFoundException('Job not found or access denied');
  }
}
