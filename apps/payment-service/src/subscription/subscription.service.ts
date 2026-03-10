import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, desc, gte, sql } from 'drizzle-orm';
import {
  Database,
  subscriptionPlans,
  subscriptions,
  employers,
  payments,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

type FeatureKey = 'job_post' | 'resume_access' | 'featured_job' | 'highlighted_job';

/**
 * Maps a dynamic plan to one of the fixed employer tier enum values: free | basic | premium | enterprise.
 * Uses price since plan names/slugs are admin-defined and can be anything.
 */
function resolvePlanTier(plan: { price: any }): string {
  const price = Number(plan.price) || 0;
  if (price === 0) return 'free';
  if (price <= 10000) return 'basic';
  if (price <= 50000) return 'premium';
  return 'enterprise';
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /**
   * Resolves a userId (from JWT x-user-id header) to the employer's ID.
   * Gateway passes users.id, but subscriptions.employerId references employers.id.
   */
  private async resolveEmployerId(userId: string): Promise<string | null> {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true },
    });
    return employer?.id || null;
  }

  // ─── Plan Management (Admin) ───────────────────────────────────

  async createPlan(dto: CreatePlanDto) {
    const [plan] = await this.db
      .insert(subscriptionPlans)
      .values({
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
        price: String(dto.price),
        currency: dto.currency || 'INR',
        billingCycle: dto.billingCycle as any,
        features: dto.features ? JSON.stringify(dto.features) : null,
        jobPostLimit: dto.jobPostLimit,
        resumeAccessLimit: dto.resumeAccessLimit,
        featuredJobs: dto.featuredJobs ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      } as any)
      .returning();

    return {
      message: 'Plan created successfully',
      data: this.parsePlanFeatures(plan),
    };
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const updateData: any = { updatedAt: new Date() };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = String(dto.price);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.billingCycle !== undefined) updateData.billingCycle = dto.billingCycle;
    if (dto.features !== undefined) updateData.features = JSON.stringify(dto.features);
    if (dto.jobPostLimit !== undefined) updateData.jobPostLimit = dto.jobPostLimit;
    if (dto.resumeAccessLimit !== undefined) updateData.resumeAccessLimit = dto.resumeAccessLimit;
    if (dto.featuredJobs !== undefined) updateData.featuredJobs = dto.featuredJobs;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const [updated] = await this.db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Plan not found');
    }

    return {
      message: 'Plan updated successfully',
      data: this.parsePlanFeatures(updated),
    };
  }

  async listPlans(query: { page?: number; limit?: number; includeInactive?: boolean }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const where = query.includeInactive ? undefined : eq(subscriptionPlans.isActive, true);

    const [plans, countResult] = await Promise.all([
      this.db.query.subscriptionPlans.findMany({
        where,
        orderBy: [asc(subscriptionPlans.sortOrder), desc(subscriptionPlans.price)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptionPlans)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      message: 'Subscription plans fetched successfully',
      data: plans.map((plan) => this.parsePlanFeatures(plan)),
      pagination: {
        totalPlan: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async getPlan(planId: string) {
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      message: 'Plan fetched successfully',
      data: this.parsePlanFeatures(plan),
    };
  }

  private parsePlanFeatures(plan: any) {
    return {
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    };
  }

  // ─── User Subscriptions ────────────────────────────────────────

  async getUserSubscription(userId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      return { message: 'No employer profile found', data: null };
    }

    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
      with: {
        plan: true,
      },
    });

    return {
      message: subscription
        ? 'Active subscription fetched successfully'
        : 'No active subscription found',
      data: subscription || null,
    };
  }

  async getSubscriptionHistory(userId: string, query: { page?: number; limit?: number }) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      return {
        message: 'No employer profile found',
        data: [],
        pagination: { totalSubscription: 0, pageCount: 0, currentPage: 1, hasNextPage: false },
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const where = eq(subscriptions.employerId, employerId);

    const [data, countResult] = await Promise.all([
      (this.db.query as any).subscriptions.findMany({
        where,
        with: {
          plan: true,
        },
        orderBy: [desc(subscriptions.createdAt)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      message: 'Subscription history fetched successfully',
      data,
      pagination: {
        totalSubscription: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      throw new NotFoundException('No employer profile found');
    }

    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)),
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const updateData: any = {
      canceledAt: new Date(),
      updatedAt: new Date(),
    };

    if (dto.immediate) {
      updateData.isActive = false;
      updateData.endDate = new Date();
    } else {
      updateData.autoRenew = false;
    }

    const [updated] = await this.db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    return {
      message: dto.immediate
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at period end',
      data: updated,
    };
  }

  // ─── Subscription Activation ──────────────────────────────────

  /**
   * Activates a subscription after successful payment.
   * - Deactivates any existing active subscription
   * - Creates new subscription with limits from the plan
   * - Links payment ↔ subscription
   * - Updates employer's subscriptionPlan and subscriptionExpiresAt
   */
  async activateSubscription(userId: string, planId: string, paymentId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      throw new NotFoundException('No employer profile found');
    }

    // Idempotency: if subscription already exists for this payment, return it
    const existing = await (this.db.query as any).subscriptions.findFirst({
      where: eq(subscriptions.paymentId, paymentId),
    });
    if (existing) {
      this.logger.log(`Subscription already exists for payment ${paymentId}`);
      return { message: 'Subscription already activated', data: existing };
    }

    // Fetch the plan
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    if (!plan.isActive) {
      throw new BadRequestException('Subscription plan is no longer active');
    }

    // Calculate end date from billing cycle
    const startDate = new Date();
    const endDate = new Date();
    const cycleDays: Record<string, number> = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
      one_time: 365,
    };
    endDate.setDate(endDate.getDate() + (cycleDays[plan.billingCycle] || 30));

    // Deactivate existing active subscription(s)
    await this.db
      .update(subscriptions)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)));

    // Create new subscription
    const [newSubscription] = await this.db
      .insert(subscriptions)
      .values({
        employerId,
        planId: plan.id,
        plan: plan.name,
        billingCycle: plan.billingCycle,
        amount: String(plan.price),
        currency: plan.currency || 'INR',
        startDate,
        endDate,
        autoRenew: plan.billingCycle !== 'one_time',
        jobPostingLimit: plan.jobPostLimit ?? 0,
        jobPostingUsed: 0,
        resumeAccessLimit: plan.resumeAccessLimit ?? 0,
        resumeAccessUsed: 0,
        featuredJobsLimit: plan.featuredJobs ?? 0,
        featuredJobsUsed: 0,
        highlightedJobsLimit: 0,
        highlightedJobsUsed: 0,
        paymentId,
        isActive: true,
      } as any)
      .returning();

    // Link payment → subscription
    await this.db
      .update(payments)
      .set({ subscriptionId: newSubscription.id, updatedAt: new Date() } as any)
      .where(eq(payments.id, paymentId));

    // Update employer record with tier derived from plan price
    await this.db
      .update(employers)
      .set({
        subscriptionPlan: resolvePlanTier(plan),
        subscriptionExpiresAt: endDate,
        updatedAt: new Date(),
      } as any)
      .where(eq(employers.id, employerId));

    this.logger.log(
      `Subscription activated: employer=${employerId}, plan=${plan.name}, payment=${paymentId}`,
    );

    return {
      message: 'Subscription activated successfully',
      data: newSubscription,
    };
  }

  /**
   * Admin-only: directly activate a subscription for an employer without payment.
   * Useful for testing, complimentary plans, or manual admin assignments.
   */
  async adminActivateSubscription(userId: string, planId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      throw new NotFoundException('No employer profile found for this user');
    }

    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    const cycleDays: Record<string, number> = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
      one_time: 365,
    };
    endDate.setDate(endDate.getDate() + (cycleDays[plan.billingCycle] || 30));

    // Deactivate existing active subscription(s)
    await this.db
      .update(subscriptions)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)));

    // Create new subscription (no paymentId)
    const [newSubscription] = await this.db
      .insert(subscriptions)
      .values({
        employerId,
        planId: plan.id,
        plan: plan.name,
        billingCycle: plan.billingCycle,
        amount: String(plan.price),
        currency: plan.currency || 'INR',
        startDate,
        endDate,
        autoRenew: plan.billingCycle !== 'one_time',
        jobPostingLimit: plan.jobPostLimit ?? 0,
        jobPostingUsed: 0,
        resumeAccessLimit: plan.resumeAccessLimit ?? 0,
        resumeAccessUsed: 0,
        featuredJobsLimit: plan.featuredJobs ?? 0,
        featuredJobsUsed: 0,
        highlightedJobsLimit: 0,
        highlightedJobsUsed: 0,
        isActive: true,
      } as any)
      .returning();

    // Update employer record
    await this.db
      .update(employers)
      .set({
        subscriptionPlan: resolvePlanTier(plan),
        subscriptionExpiresAt: endDate,
        updatedAt: new Date(),
      } as any)
      .where(eq(employers.id, employerId));

    this.logger.log(`Admin activated subscription: employer=${employerId}, plan=${plan.name}`);

    return {
      message: 'Subscription activated successfully by admin',
      data: newSubscription,
    };
  }

  // ─── Feature Access & Usage ────────────────────────────────────

  async checkFeatureAccess(
    userId: string,
    feature: string,
  ): Promise<{
    message: string;
    data: { feature: string; hasAccess: boolean; remaining: number };
  }> {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      return {
        message: 'Feature access checked',
        data: { feature, hasAccess: false, remaining: 0 },
      };
    }

    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
    });

    if (!subscription) {
      return {
        message: 'Feature access checked',
        data: { feature, hasAccess: false, remaining: 0 },
      };
    }

    const limitMap: Record<string, { limit: number; used: number }> = {
      job_post: {
        limit: subscription.jobPostingLimit ?? 0,
        used: subscription.jobPostingUsed ?? 0,
      },
      resume_access: {
        limit: subscription.resumeAccessLimit ?? 0,
        used: subscription.resumeAccessUsed ?? 0,
      },
      featured_job: {
        limit: subscription.featuredJobsLimit ?? 0,
        used: subscription.featuredJobsUsed ?? 0,
      },
      highlighted_job: {
        limit: subscription.highlightedJobsLimit ?? 0,
        used: subscription.highlightedJobsUsed ?? 0,
      },
    };

    const featureData = limitMap[feature];
    if (!featureData) {
      return {
        message: 'Feature access checked',
        data: { feature, hasAccess: false, remaining: 0 },
      };
    }

    const remaining = featureData.limit - featureData.used;
    return {
      message: 'Feature access checked',
      data: { feature, hasAccess: remaining > 0, remaining: Math.max(0, remaining) },
    };
  }

  async getSubscriptionUsage(userId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      return { message: 'No employer profile found', data: null };
    }

    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
      with: { plan: true },
    });

    if (!subscription) {
      return { message: 'No active subscription found', data: null };
    }

    return {
      message: 'Subscription usage fetched successfully',
      data: {
        planName: subscription.plan,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        usage: {
          jobPosting: {
            limit: subscription.jobPostingLimit ?? 0,
            used: subscription.jobPostingUsed ?? 0,
            remaining: (subscription.jobPostingLimit ?? 0) - (subscription.jobPostingUsed ?? 0),
          },
          featuredJobs: {
            limit: subscription.featuredJobsLimit ?? 0,
            used: subscription.featuredJobsUsed ?? 0,
            remaining: (subscription.featuredJobsLimit ?? 0) - (subscription.featuredJobsUsed ?? 0),
          },
          resumeAccess: {
            limit: subscription.resumeAccessLimit ?? 0,
            used: subscription.resumeAccessUsed ?? 0,
            remaining: (subscription.resumeAccessLimit ?? 0) - (subscription.resumeAccessUsed ?? 0),
          },
          highlightedJobs: {
            limit: subscription.highlightedJobsLimit ?? 0,
            used: subscription.highlightedJobsUsed ?? 0,
            remaining:
              (subscription.highlightedJobsLimit ?? 0) - (subscription.highlightedJobsUsed ?? 0),
          },
        },
      },
    };
  }

  async getRemainingCredits(
    userId: string,
  ): Promise<{ message: string; data: { credits: number } }> {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      return { message: 'Remaining credits fetched successfully', data: { credits: 0 } };
    }

    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
    });

    const credits = subscription
      ? (subscription.jobPostingLimit ?? 0) - (subscription.jobPostingUsed ?? 0)
      : 0;

    return {
      message: 'Remaining credits fetched successfully',
      data: { credits },
    };
  }

  async useCredit(userId: string, feature: FeatureKey = 'job_post'): Promise<boolean> {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) return false;

    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
    });
    if (!subscription) return false;

    const columnMap: Record<FeatureKey, { usedCol: any; limitCol: any; usedField: string }> = {
      job_post: {
        usedCol: subscriptions.jobPostingUsed,
        limitCol: subscriptions.jobPostingLimit,
        usedField: 'jobPostingUsed',
      },
      featured_job: {
        usedCol: subscriptions.featuredJobsUsed,
        limitCol: subscriptions.featuredJobsLimit,
        usedField: 'featuredJobsUsed',
      },
      highlighted_job: {
        usedCol: subscriptions.highlightedJobsUsed,
        limitCol: subscriptions.highlightedJobsLimit,
        usedField: 'highlightedJobsUsed',
      },
      resume_access: {
        usedCol: subscriptions.resumeAccessUsed,
        limitCol: subscriptions.resumeAccessLimit,
        usedField: 'resumeAccessUsed',
      },
    };

    const cols = columnMap[feature];
    if (!cols) return false;

    // Atomic increment: only succeeds if used < limit
    const result = await this.db
      .update(subscriptions)
      .set({
        [cols.usedField]: sql`${cols.usedCol} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(subscriptions.id, subscription.id), sql`${cols.usedCol} < ${cols.limitCol}`))
      .returning({ id: subscriptions.id });

    return result.length > 0;
  }
}
