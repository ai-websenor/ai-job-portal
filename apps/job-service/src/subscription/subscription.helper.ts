import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  Database,
  employers,
  subscriptions,
  subscriptionPlans,
  users,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

export type FeatureKey = 'job_post' | 'featured_job' | 'highlighted_job' | 'resume_access';

/**
 * Maps a dynamic plan to one of the fixed employer tier enum values.
 */
function resolvePlanTier(plan: { price: any }): string {
  const price = Number(plan.price) || 0;
  if (price === 0) return 'free';
  if (price <= 10000) return 'basic';
  if (price <= 50000) return 'premium';
  return 'enterprise';
}

@Injectable()
export class SubscriptionHelper {
  private readonly logger = new Logger(SubscriptionHelper.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /**
   * Resolves userId (from JWT x-user-id) to employers.id
   */
  async resolveEmployerId(userId: string): Promise<string | null> {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
      columns: { id: true },
    });
    return employer?.id || null;
  }

  /**
   * Gets the active subscription for an employer.
   * Includes lazy activation: if the active subscription has expired and a scheduled one exists,
   * automatically transitions to the scheduled subscription.
   * Falls back to the company's super_employer subscription if none found.
   */
  async getActiveSubscription(employerId: string) {
    // Check employer's own active subscription first
    let own: any = await this.db.query.subscriptions.findFirst({
      where: and(eq(subscriptions.employerId, employerId), eq(subscriptions.isActive, true)),
    });

    // Lazy expiry + activation inside a transaction with row-level locking
    if (own && new Date(own.endDate) < new Date()) {
      own = await this.db.transaction(async (tx) => {
        // Re-fetch with FOR UPDATE to prevent race conditions
        const [locked] = await tx
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.id, own.id), eq(subscriptions.isActive, true)))
          .for('update');

        if (!locked || new Date(locked.endDate) >= new Date()) return locked || null;

        // Expire the active subscription
        await tx
          .update(subscriptions)
          .set({ isActive: false, status: 'expired', updatedAt: new Date() } as any)
          .where(eq(subscriptions.id, locked.id));

        this.logger.log(
          `Lazy expiry: subscription ${locked.id} expired for employer ${employerId}`,
        );

        // Check for a scheduled subscription ready to activate
        const [scheduled] = await tx
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.employerId, employerId),
              sql`${subscriptions.status} = 'scheduled'`,
              lte(subscriptions.startDate, new Date()),
            ),
          )
          .for('update')
          .limit(1);

        if (scheduled) {
          const [activated] = await tx
            .update(subscriptions)
            .set({ isActive: true, status: 'active', updatedAt: new Date() } as any)
            .where(eq(subscriptions.id, scheduled.id))
            .returning();

          // Fetch plan for tier resolution
          if (scheduled.planId) {
            const plan = await tx.query.subscriptionPlans.findFirst({
              where: eq(subscriptionPlans.id, scheduled.planId),
            });
            if (plan) {
              await tx
                .update(employers)
                .set({
                  subscriptionPlan: resolvePlanTier(plan),
                  subscriptionExpiresAt: scheduled.endDate,
                  updatedAt: new Date(),
                } as any)
                .where(eq(employers.id, employerId));
            }
          }

          this.logger.log(
            `Lazy activation: subscription ${scheduled.id} activated for employer ${employerId}`,
          );
          return { ...scheduled, ...activated, isActive: true, status: 'active' };
        }

        // No scheduled subscription — reset employer to free
        await tx
          .update(employers)
          .set({
            subscriptionPlan: 'free',
            subscriptionExpiresAt: null,
            updatedAt: new Date(),
          } as any)
          .where(eq(employers.id, employerId));

        return null;
      });
    } else if (!own) {
      // No active subscription — check for scheduled subscription ready to activate
      own = await this.db.transaction(async (tx) => {
        const [scheduled] = await tx
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.employerId, employerId),
              sql`${subscriptions.status} = 'scheduled'`,
              lte(subscriptions.startDate, new Date()),
            ),
          )
          .for('update')
          .limit(1);

        if (!scheduled) return null;

        const [activated] = await tx
          .update(subscriptions)
          .set({ isActive: true, status: 'active', updatedAt: new Date() } as any)
          .where(eq(subscriptions.id, scheduled.id))
          .returning();

        if (scheduled.planId) {
          const plan = await tx.query.subscriptionPlans.findFirst({
            where: eq(subscriptionPlans.id, scheduled.planId),
          });
          if (plan) {
            await tx
              .update(employers)
              .set({
                subscriptionPlan: resolvePlanTier(plan),
                subscriptionExpiresAt: scheduled.endDate,
                updatedAt: new Date(),
              } as any)
              .where(eq(employers.id, employerId));
          }
        }

        this.logger.log(
          `Lazy activation: subscription ${scheduled.id} activated for employer ${employerId}`,
        );
        return { ...scheduled, ...activated, isActive: true, status: 'active' };
      });
    }

    if (own) return own;

    // Fallback: find the company's super_employer subscription
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.id, employerId),
      columns: { companyId: true },
    });
    if (!employer?.companyId) return null;

    // Find the super_employer (company owner) in the same company
    const superEmployerResult = await this.db
      .select({ id: employers.id })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .where(and(eq(employers.companyId, employer.companyId), eq(users.role, 'super_employer')))
      .limit(1);
    const superEmployer = superEmployerResult[0];
    if (!superEmployer || superEmployer.id === employerId) return null;

    return this.db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, superEmployer.id),
        eq(subscriptions.isActive, true),
        gte(subscriptions.endDate, new Date()),
      ),
    });
  }

  /**
   * Checks whether the employer has remaining quota for a given feature.
   * Throws ForbiddenException if limit is exceeded.
   */
  checkLimit(subscription: any, feature: FeatureKey): void {
    const limitMap: Record<FeatureKey, { limit: number; used: number; label: string }> = {
      job_post: {
        limit: subscription.jobPostingLimit ?? 0,
        used: subscription.jobPostingUsed ?? 0,
        label: 'job posting',
      },
      featured_job: {
        limit: subscription.featuredJobsLimit ?? 0,
        used: subscription.featuredJobsUsed ?? 0,
        label: 'featured job',
      },
      highlighted_job: {
        limit: subscription.highlightedJobsLimit ?? 0,
        used: subscription.highlightedJobsUsed ?? 0,
        label: 'highlighted job',
      },
      resume_access: {
        limit: subscription.resumeAccessLimit ?? 0,
        used: subscription.resumeAccessUsed ?? 0,
        label: 'resume access',
      },
    };

    const data = limitMap[feature];
    if (data.used >= data.limit) {
      throw new ForbiddenException(
        `You have reached your ${data.label} limit (${data.limit}) for your current plan. Please upgrade your subscription plan.`,
      );
    }
  }

  /**
   * Atomically increments usage for a feature.
   * Returns true if increment succeeded, false if limit was already reached.
   */
  async incrementUsage(subscriptionId: string, feature: FeatureKey): Promise<boolean> {
    const columnPairs: Record<FeatureKey, { usedCol: any; limitCol: any; usedField: string }> = {
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

    const cols = columnPairs[feature];

    // Atomic: only increments if used < limit
    const result = await this.db
      .update(subscriptions)
      .set({
        [cols.usedField]: sql`${cols.usedCol} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(subscriptions.id, subscriptionId), sql`${cols.usedCol} < ${cols.limitCol}`))
      .returning({ id: subscriptions.id });

    return result.length > 0;
  }
}
