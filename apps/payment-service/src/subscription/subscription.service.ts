import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, asc, desc, gte, lt, lte, sql } from 'drizzle-orm';
import {
  Database,
  subscriptionPlans,
  subscriptions,
  employers,
  payments,
  users,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

type FeatureKey =
  | 'job_post'
  | 'resume_access'
  | 'featured_job'
  | 'highlighted_job'
  | 'member_adding';

type TransitionType = 'new' | 'upgrade' | 'downgrade' | 'same_plan';

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

const CYCLE_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  one_time: 365,
};

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

  /**
   * Finds the active subscription for an employer.
   * Includes lazy activation: if the active subscription has expired and a scheduled one exists,
   * automatically transitions to the scheduled subscription.
   * Falls back to the company's super_employer subscription if none found.
   */
  private async findActiveSubscription(employerId: string) {
    // Check employer's own active subscription first
    let own = await (this.db.query as any).subscriptions.findFirst({
      where: and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)),
      with: { plan: true },
    });

    // Lazy expiry: if active subscription has expired, mark it and check for scheduled
    if (own && new Date(own.endDate) < new Date()) {
      await this.db
        .update(subscriptions)
        .set({ isActive: false, status: 'expired', updatedAt: new Date() } as any)
        .where(eq(subscriptions.id, own.id));

      // Update employer tier to free since the plan expired
      await this.db
        .update(employers)
        .set({
          subscriptionPlan: 'free',
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(employers.id, employerId));

      this.logger.log(`Lazy expiry: subscription ${own.id} expired for employer ${employerId}`);
      own = null;
    }

    // Lazy activation: if no active subscription, check for a scheduled one ready to activate
    if (!own) {
      const scheduled = await (this.db.query as any).subscriptions.findFirst({
        where: and(
          eq(subscriptions.employerId, employerId),
          sql`${subscriptions.status} = 'scheduled'`,
          lte(subscriptions.startDate, new Date()),
        ),
        with: { plan: true },
      });

      if (scheduled) {
        const [activated] = await this.db
          .update(subscriptions)
          .set({ isActive: true, status: 'active', updatedAt: new Date() } as any)
          .where(eq(subscriptions.id, scheduled.id))
          .returning();

        // Update employer tier
        if (scheduled.plan) {
          await this.db
            .update(employers)
            .set({
              subscriptionPlan: resolvePlanTier(scheduled.plan),
              subscriptionExpiresAt: scheduled.endDate,
              updatedAt: new Date(),
            } as any)
            .where(eq(employers.id, employerId));
        }

        this.logger.log(
          `Lazy activation: subscription ${scheduled.id} activated for employer ${employerId}`,
        );
        return { ...scheduled, ...activated, isActive: true, status: 'active' };
      }
    }

    if (own) return own;

    // Fallback: find the company's super_employer subscription
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.id, employerId),
      columns: { companyId: true },
    });
    if (!employer?.companyId) return null;

    const superEmployerResult = await this.db
      .select({ id: employers.id })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .where(and(eq(employers.companyId, employer.companyId), eq(users.role, 'super_employer')))
      .limit(1);
    const superEmployer = superEmployerResult[0];
    if (!superEmployer || superEmployer.id === employerId) return null;

    return (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, superEmployer.id),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
      with: { plan: true },
    });
  }

  /**
   * Determines the transition type between current and new plan using rank.
   */
  private determineTransitionType(
    currentPlan: { rank: number } | null,
    newPlan: { rank: number },
  ): TransitionType {
    if (!currentPlan) return 'new';
    if (newPlan.rank > currentPlan.rank) return 'upgrade';
    if (newPlan.rank < currentPlan.rank) return 'downgrade';
    return 'same_plan';
  }

  /**
   * Calculates remaining credits from a subscription.
   */
  private calculateRemainingCredits(subscription: any) {
    return {
      jobPosting: Math.max(
        0,
        (subscription.jobPostingLimit ?? 0) - (subscription.jobPostingUsed ?? 0),
      ),
      resumeAccess: Math.max(
        0,
        (subscription.resumeAccessLimit ?? 0) - (subscription.resumeAccessUsed ?? 0),
      ),
      featuredJobs: Math.max(
        0,
        (subscription.featuredJobsLimit ?? 0) - (subscription.featuredJobsUsed ?? 0),
      ),
      highlightedJobs: Math.max(
        0,
        (subscription.highlightedJobsLimit ?? 0) - (subscription.highlightedJobsUsed ?? 0),
      ),
      memberAdding:
        subscription.memberAddingLimit !== null
          ? Math.max(
              0,
              (subscription.memberAddingLimit ?? 0) - (subscription.memberAddingUsed ?? 0),
            )
          : null,
    };
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
        memberAddingLimit: dto.memberAddingLimit ?? null,
        rank: dto.rank,
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
    if (dto.memberAddingLimit !== undefined) updateData.memberAddingLimit = dto.memberAddingLimit;
    if (dto.rank !== undefined) updateData.rank = dto.rank;
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

  // ─── Preview Change ──────────────────────────────────────────────

  /**
   * Previews a plan change without creating a payment.
   * Returns transition type, current usage, warnings, and carry-forward info.
   */
  async previewChange(userId: string, planId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      throw new NotFoundException('No employer profile found');
    }

    const newPlan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });
    if (!newPlan) {
      throw new NotFoundException('Subscription plan not found');
    }
    if (!newPlan.isActive) {
      throw new BadRequestException('This subscription plan is no longer available');
    }

    const currentSubscription = await this.findActiveSubscription(employerId);
    const currentPlan = currentSubscription?.plan ?? null;

    const transitionType = this.determineTransitionType(
      currentPlan ? { rank: currentPlan.rank ?? 0 } : null,
      { rank: newPlan.rank ?? 0 },
    );

    const warnings: string[] = [];
    let currentUsage: any = null;
    let carryForwardCredits: any = null;

    if (currentSubscription) {
      const remaining = this.calculateRemainingCredits(currentSubscription);
      currentUsage = {
        jobPosting: {
          used: currentSubscription.jobPostingUsed ?? 0,
          currentLimit: currentSubscription.jobPostingLimit ?? 0,
          newLimit: newPlan.jobPostLimit ?? 0,
          remaining: remaining.jobPosting,
        },
        resumeAccess: {
          used: currentSubscription.resumeAccessUsed ?? 0,
          currentLimit: currentSubscription.resumeAccessLimit ?? 0,
          newLimit: newPlan.resumeAccessLimit ?? 0,
          remaining: remaining.resumeAccess,
        },
        featuredJobs: {
          used: currentSubscription.featuredJobsUsed ?? 0,
          currentLimit: currentSubscription.featuredJobsLimit ?? 0,
          newLimit: newPlan.featuredJobs ?? 0,
          remaining: remaining.featuredJobs,
        },
        highlightedJobs: {
          used: currentSubscription.highlightedJobsUsed ?? 0,
          currentLimit: currentSubscription.highlightedJobsLimit ?? 0,
          newLimit: 0,
          remaining: remaining.highlightedJobs,
        },
      };

      if (transitionType === 'upgrade') {
        // Show carry-forward info for upgrades
        carryForwardCredits = {
          jobPosting: remaining.jobPosting,
          resumeAccess: remaining.resumeAccess,
          featuredJobs: remaining.featuredJobs,
          highlightedJobs: remaining.highlightedJobs,
        };
      }

      if (transitionType === 'downgrade') {
        // Warn if current usage exceeds new plan limits
        if (currentUsage.jobPosting.used > (newPlan.jobPostLimit ?? 0)) {
          warnings.push(
            `Your job posting usage (${currentUsage.jobPosting.used}) exceeds the new plan limit (${newPlan.jobPostLimit ?? 0}). You won't be able to post new jobs until usage drops below the limit.`,
          );
        }
        if (currentUsage.resumeAccess.used > (newPlan.resumeAccessLimit ?? 0)) {
          warnings.push(
            `Your resume access usage (${currentUsage.resumeAccess.used}) exceeds the new plan limit (${newPlan.resumeAccessLimit ?? 0}).`,
          );
        }
        if (currentUsage.featuredJobs.used > (newPlan.featuredJobs ?? 0)) {
          warnings.push(
            `Your featured jobs usage (${currentUsage.featuredJobs.used}) exceeds the new plan limit (${newPlan.featuredJobs ?? 0}).`,
          );
        }
      }
    }

    // Check if there's already a scheduled subscription
    const existingScheduled = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        sql`${subscriptions.status} = 'scheduled'`,
      ),
      with: { plan: true },
    });

    return {
      message: 'Plan change preview generated successfully',
      data: {
        transitionType,
        currentPlan: currentPlan
          ? {
              id: currentPlan.id,
              name: currentPlan.name,
              rank: currentPlan.rank ?? 0,
              billingCycle: currentPlan.billingCycle,
            }
          : null,
        newPlan: {
          id: newPlan.id,
          name: newPlan.name,
          rank: newPlan.rank ?? 0,
          price: newPlan.price,
          currency: newPlan.currency,
          billingCycle: newPlan.billingCycle,
        },
        currentSubscription: currentSubscription
          ? {
              id: currentSubscription.id,
              startDate: currentSubscription.startDate,
              endDate: currentSubscription.endDate,
            }
          : null,
        activationBehavior:
          transitionType === 'downgrade'
            ? 'Activates after current plan expires'
            : 'Activates immediately',
        currentUsage,
        carryForwardCredits,
        warnings,
        existingScheduledPlan: existingScheduled
          ? {
              id: existingScheduled.id,
              planName: existingScheduled.plan?.name ?? existingScheduled.plan,
              startDate: existingScheduled.startDate,
              message: 'This scheduled subscription will be replaced by the new purchase.',
            }
          : null,
      },
    };
  }

  // ─── User Subscriptions ────────────────────────────────────────

  async getUserSubscription(userId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      return { message: 'No employer profile found', data: null };
    }

    const subscription = await this.findActiveSubscription(employerId);

    // Also fetch any scheduled subscription
    let scheduledSubscription = null;
    if (subscription) {
      scheduledSubscription = await (this.db.query as any).subscriptions.findFirst({
        where: and(
          eq(subscriptions.employerId, employerId),
          sql`${subscriptions.status} = 'scheduled'`,
        ),
        with: { plan: true },
      });
    }

    return {
      message: subscription
        ? 'Active subscription fetched successfully'
        : 'No active subscription found',
      data: subscription || null,
      scheduledSubscription: scheduledSubscription || null,
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
      updateData.status = 'canceled';
      updateData.endDate = new Date();
    } else {
      updateData.autoRenew = false;
    }

    const [updated] = await this.db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    // Also cancel any scheduled subscription for this employer
    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        isActive: false,
        canceledAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(
        and(eq(subscriptions.employerId, employerId), sql`${subscriptions.status} = 'scheduled'`),
      );

    // Reset employer tier when immediately canceling
    if (dto.immediate) {
      await this.db
        .update(employers)
        .set({
          subscriptionPlan: 'free',
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        } as any)
        .where(eq(employers.id, employerId));

      this.logger.log(`Subscription canceled immediately: employer=${employerId}`);
    } else {
      this.logger.log(`Subscription set to cancel at period end: employer=${employerId}`);
    }

    return {
      message: dto.immediate
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at period end',
      data: updated,
    };
  }

  // ─── Subscribe (Pre-payment Validation) ──────────────────────

  /**
   * Validates a subscribe request before creating a payment order.
   * Checks for duplicate pending payments to prevent double-charging.
   * Returns the validated plan data and transition info.
   */
  async validateSubscribeRequest(userId: string, planId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) {
      throw new NotFoundException('No employer profile found');
    }

    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    if (!plan.isActive) {
      throw new BadRequestException('This subscription plan is no longer available');
    }

    const price = Number(plan.price) || 0;
    if (price <= 0) {
      throw new BadRequestException(
        'This is a free plan and does not require payment. Use the admin activation endpoint.',
      );
    }

    // Mark stale pending payments as failed (older than 15 minutes) so users can retry
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
    await this.db
      .update(payments)
      .set({ status: 'failed', updatedAt: new Date() } as any)
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.status, 'pending'),
          lt(payments.createdAt, staleThreshold),
        ),
      );

    // Check for existing recent pending payment for the same plan
    const pendingPayment = await (this.db.query as any).payments.findFirst({
      where: and(
        eq(payments.userId, userId),
        eq(payments.status, 'pending'),
        sql`${payments.metadata}::jsonb->>'planId' = ${planId}`,
      ),
    });

    if (pendingPayment) {
      throw new ConflictException(
        'Your payment is currently pending. Please retry after 15 minutes',
      );
    }

    // Determine transition type
    const currentSubscription = await this.findActiveSubscription(employerId);
    const currentPlan = currentSubscription?.plan ?? null;
    const transitionType = this.determineTransitionType(
      currentPlan ? { rank: currentPlan.rank ?? 0 } : null,
      { rank: plan.rank ?? 0 },
    );

    return { plan, employerId, transitionType, currentSubscription };
  }

  // ─── Subscription Activation ──────────────────────────────────

  /**
   * Activates a subscription after successful payment.
   * Handles upgrade/downgrade/same_plan/new transitions:
   *
   * - NEW: Activate immediately, fresh limits.
   * - UPGRADE: Activate immediately, carry forward remaining credits from old plan.
   * - DOWNGRADE: Schedule activation for after current plan expires.
   * - SAME_PLAN: Activate immediately, reset limits (fresh start).
   *
   * Uses idempotency check (paymentId) to prevent double activation.
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

    // Fetch current active subscription to determine transition
    const currentSubscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)),
      with: { plan: true },
    });

    const currentPlan = currentSubscription?.plan ?? null;
    const transitionType = this.determineTransitionType(
      currentPlan ? { rank: currentPlan.rank ?? 0 } : null,
      { rank: plan.rank ?? 0 },
    );

    // Handle DOWNGRADE: schedule for after current plan expires
    if (transitionType === 'downgrade' && currentSubscription) {
      return this.scheduleDowngrade(employerId, plan, paymentId, currentSubscription);
    }

    // Handle UPGRADE, SAME_PLAN, NEW: activate immediately
    return this.activateImmediately(
      employerId,
      plan,
      paymentId,
      transitionType,
      currentSubscription,
    );
  }

  /**
   * Schedules a downgrade subscription to activate after the current plan expires.
   */
  private async scheduleDowngrade(
    employerId: string,
    plan: any,
    paymentId: string,
    currentSubscription: any,
  ) {
    // Cancel any existing scheduled subscriptions for this employer
    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        isActive: false,
        canceledAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(
        and(eq(subscriptions.employerId, employerId), sql`${subscriptions.status} = 'scheduled'`),
      );

    // Schedule new subscription to start when current one ends
    const startDate = new Date(currentSubscription.endDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (CYCLE_DAYS[plan.billingCycle] || 30));

    const [scheduled] = await this.db
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
        memberAddingLimit: plan.memberAddingLimit ?? null,
        memberAddingUsed: 0,
        paymentId,
        isActive: false,
        status: 'scheduled',
        previousSubscriptionId: currentSubscription.id,
        transitionType: 'downgrade',
      } as any)
      .returning();

    // Link payment → subscription
    await this.db
      .update(payments)
      .set({ subscriptionId: scheduled.id, updatedAt: new Date() } as any)
      .where(eq(payments.id, paymentId));

    this.logger.log(
      `Downgrade scheduled: employer=${employerId}, plan=${plan.name}, activates=${startDate.toISOString()}, payment=${paymentId}`,
    );

    return {
      message: `Downgrade to ${plan.name} scheduled. Will activate after current plan expires on ${startDate.toISOString().split('T')[0]}.`,
      data: scheduled,
    };
  }

  /**
   * Immediately activates a subscription (for new, upgrade, same_plan).
   * For upgrades, carries forward remaining credits from the old plan.
   */
  private async activateImmediately(
    employerId: string,
    plan: any,
    paymentId: string,
    transitionType: TransitionType,
    currentSubscription: any | null,
  ) {
    // Calculate carry-forward credits for upgrades
    let carryForward: any = null;
    let newJobPostingLimit = plan.jobPostLimit ?? 0;
    let newResumeAccessLimit = plan.resumeAccessLimit ?? 0;
    let newFeaturedJobsLimit = plan.featuredJobs ?? 0;
    let newHighlightedJobsLimit = 0;
    let newMemberAddingLimit = plan.memberAddingLimit ?? null;

    if (transitionType === 'upgrade' && currentSubscription) {
      const remaining = this.calculateRemainingCredits(currentSubscription);
      carryForward = remaining;

      newJobPostingLimit += remaining.jobPosting;
      newResumeAccessLimit += remaining.resumeAccess;
      newFeaturedJobsLimit += remaining.featuredJobs;
      newHighlightedJobsLimit += remaining.highlightedJobs;
      // For member_adding: if new plan has unlimited (null), keep unlimited; otherwise add
      if (newMemberAddingLimit !== null && remaining.memberAdding !== null) {
        newMemberAddingLimit += remaining.memberAdding;
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (CYCLE_DAYS[plan.billingCycle] || 30));

    // Cancel any existing scheduled subscriptions for this employer
    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        isActive: false,
        canceledAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(
        and(eq(subscriptions.employerId, employerId), sql`${subscriptions.status} = 'scheduled'`),
      );

    // Deactivate existing active subscription(s)
    if (currentSubscription) {
      await this.db
        .update(subscriptions)
        .set({ isActive: false, status: 'expired', updatedAt: new Date() } as any)
        .where(and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)));
    }

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
        jobPostingLimit: newJobPostingLimit,
        jobPostingUsed: 0,
        resumeAccessLimit: newResumeAccessLimit,
        resumeAccessUsed: 0,
        featuredJobsLimit: newFeaturedJobsLimit,
        featuredJobsUsed: 0,
        highlightedJobsLimit: newHighlightedJobsLimit,
        highlightedJobsUsed: 0,
        memberAddingLimit: newMemberAddingLimit,
        memberAddingUsed: 0,
        paymentId,
        isActive: true,
        status: 'active',
        previousSubscriptionId: currentSubscription?.id ?? null,
        transitionType,
        carryForwardCredits: carryForward ? JSON.stringify(carryForward) : null,
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
      `Subscription activated (${transitionType}): employer=${employerId}, plan=${plan.name}, payment=${paymentId}${carryForward ? ', carryForward=' + JSON.stringify(carryForward) : ''}`,
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
    endDate.setDate(endDate.getDate() + (CYCLE_DAYS[plan.billingCycle] || 30));

    // Cancel any scheduled subscriptions
    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        isActive: false,
        canceledAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(
        and(eq(subscriptions.employerId, employerId), sql`${subscriptions.status} = 'scheduled'`),
      );

    // Deactivate existing active subscription(s)
    await this.db
      .update(subscriptions)
      .set({ isActive: false, status: 'expired', updatedAt: new Date() } as any)
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
        memberAddingLimit: plan.memberAddingLimit ?? null,
        memberAddingUsed: 0,
        isActive: true,
        status: 'active',
        transitionType: 'new',
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

  // ─── Cron: Activate Scheduled & Expire Old ────────────────────

  /**
   * Called by the cron job to activate scheduled subscriptions and expire old ones.
   * Also handles lazy cases where the user hasn't logged in.
   */
  async activateScheduledSubscriptions() {
    const now = new Date();

    // 1. Expire active subscriptions that have passed their end date
    const expired = await this.db
      .update(subscriptions)
      .set({ isActive: false, status: 'expired', updatedAt: now } as any)
      .where(and(eq(subscriptions.isActive, true), lt(subscriptions.endDate, now)))
      .returning({ id: subscriptions.id, employerId: subscriptions.employerId });

    if (expired.length > 0) {
      this.logger.log(`Cron: expired ${expired.length} subscription(s)`);

      // Reset employer tiers for expired subscriptions (only if no other active sub)
      for (const sub of expired) {
        const stillActive = await (this.db.query as any).subscriptions.findFirst({
          where: and(
            eq(subscriptions.employerId, sub.employerId),
            eq(subscriptions.isActive, true),
          ),
        });
        if (!stillActive) {
          await this.db
            .update(employers)
            .set({
              subscriptionPlan: 'free',
              subscriptionExpiresAt: null,
              updatedAt: now,
            } as any)
            .where(eq(employers.id, sub.employerId));
        }
      }
    }

    // 2. Activate scheduled subscriptions whose start date has arrived
    const readyToActivate = await this.db
      .select()
      .from(subscriptions)
      .where(and(sql`${subscriptions.status} = 'scheduled'`, lte(subscriptions.startDate, now)));

    for (const scheduled of readyToActivate) {
      // Ensure no other active subscription exists for this employer
      const existingActive = await (this.db.query as any).subscriptions.findFirst({
        where: and(
          eq(subscriptions.employerId, scheduled.employerId),
          eq(subscriptions.isActive, true),
        ),
      });

      if (existingActive) {
        // If active sub still exists (edge case), expire it first
        await this.db
          .update(subscriptions)
          .set({ isActive: false, status: 'expired', updatedAt: now } as any)
          .where(eq(subscriptions.id, existingActive.id));
      }

      // Activate the scheduled subscription
      await this.db
        .update(subscriptions)
        .set({ isActive: true, status: 'active', updatedAt: now } as any)
        .where(eq(subscriptions.id, scheduled.id));

      // Fetch plan for tier resolution
      const plan = scheduled.planId
        ? await this.db.query.subscriptionPlans.findFirst({
            where: eq(subscriptionPlans.id, scheduled.planId),
          })
        : null;

      // Update employer record
      await this.db
        .update(employers)
        .set({
          subscriptionPlan: plan ? resolvePlanTier(plan) : 'basic',
          subscriptionExpiresAt: scheduled.endDate,
          updatedAt: now,
        } as any)
        .where(eq(employers.id, scheduled.employerId));

      this.logger.log(
        `Cron: activated scheduled subscription ${scheduled.id} for employer ${scheduled.employerId}`,
      );
    }

    return {
      expired: expired.length,
      activated: readyToActivate.length,
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

    const subscription = await this.findActiveSubscription(employerId);

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
      member_adding: {
        limit: subscription.memberAddingLimit ?? null,
        used: subscription.memberAddingUsed ?? 0,
      },
    };

    const featureData = limitMap[feature];
    if (!featureData) {
      return {
        message: 'Feature access checked',
        data: { feature, hasAccess: false, remaining: 0 },
      };
    }

    // null limit means unlimited
    if (featureData.limit === null) {
      return {
        message: 'Feature access checked',
        data: { feature, hasAccess: true, remaining: -1 },
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

    const subscription = await this.findActiveSubscription(employerId);

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
          memberAdding: {
            limit: subscription.memberAddingLimit ?? null,
            used: subscription.memberAddingUsed ?? 0,
            remaining:
              subscription.memberAddingLimit !== null
                ? (subscription.memberAddingLimit ?? 0) - (subscription.memberAddingUsed ?? 0)
                : -1,
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

    const subscription = await this.findActiveSubscription(employerId);

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

    const subscription = await this.findActiveSubscription(employerId);
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
      member_adding: {
        usedCol: subscriptions.memberAddingUsed,
        limitCol: subscriptions.memberAddingLimit,
        usedField: 'memberAddingUsed',
      },
    };

    const cols = columnMap[feature];
    if (!cols) return false;

    // Atomic increment: succeeds if limit is NULL (unlimited) or used < limit
    const result = await this.db
      .update(subscriptions)
      .set({
        [cols.usedField]: sql`${cols.usedCol} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(subscriptions.id, subscription.id),
          sql`(${cols.limitCol} IS NULL OR ${cols.usedCol} < ${cols.limitCol})`,
        ),
      )
      .returning({ id: subscriptions.id });

    return result.length > 0;
  }
}
