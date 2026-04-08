import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { Database, employers, subscriptions, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

export type FeatureKey = 'job_post' | 'featured_job' | 'highlighted_job' | 'resume_access';

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
   * Falls back to the company's super_employer subscription if none found.
   */
  async getActiveSubscription(employerId: string) {
    // Check employer's own subscription first
    const own = await this.db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, employerId),
        eq(subscriptions.isActive, true),
        sql`(${subscriptions.endDate} IS NULL OR ${subscriptions.endDate} >= NOW())`,
      ),
    });
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
        sql`(${subscriptions.endDate} IS NULL OR ${subscriptions.endDate} >= NOW())`,
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
