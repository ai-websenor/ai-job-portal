import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, asc, desc, gte, sql } from 'drizzle-orm';
import { Database, subscriptionPlans, subscriptions } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // Plan Management (Admin)
  async createPlan(dto: CreatePlanDto) {
    const [plan] = await this.db
      .insert(subscriptionPlans)
      .values({
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'INR',
        features: dto.features ? JSON.stringify(dto.features) : null,
        isActive: true,
      } as any)
      .returning();

    return {
      message: 'Plan created successfully',
      data: this.parsePlanFeatures(plan),
    };
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const updateData: any = { ...dto, updatedAt: new Date() };
    if (dto.features) {
      updateData.features = JSON.stringify(dto.features);
    }
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

  // User Subscriptions
  async getUserSubscription(userId: string) {
    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, userId),
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
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const where = eq(subscriptions.employerId, userId);

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
    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(eq(subscriptions.employerId, userId), eq(subscriptions.isActive, true)),
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

  async checkFeatureAccess(
    userId: string,
    feature: string,
  ): Promise<{ message: string; data: { feature: string; hasAccess: boolean } }> {
    const result = await this.getUserSubscription(userId);
    const subscription = result.data;

    if (!subscription) {
      return {
        message: 'Feature access checked',
        data: { feature, hasAccess: false },
      };
    }

    const plan = (await this.getPlan(subscription.planId)).data;
    const features = Array.isArray(plan.features) ? plan.features : [];
    const hasAccess = features.includes(feature);

    return {
      message: 'Feature access checked',
      data: { feature, hasAccess },
    };
  }

  async getRemainingCredits(
    userId: string,
  ): Promise<{ message: string; data: { credits: number } }> {
    const result = await this.getUserSubscription(userId);
    const subscription = result.data;
    const credits = subscription ? subscription.jobPostingLimit - subscription.jobPostingUsed : 0;

    return {
      message: 'Remaining credits fetched successfully',
      data: { credits },
    };
  }

  async useCredit(userId: string): Promise<boolean> {
    const result = await this.getUserSubscription(userId);
    const subscription = result.data;
    if (!subscription) {
      return false;
    }
    if (subscription.jobPostingUsed >= subscription.jobPostingLimit) {
      return false;
    }
    await this.db
      .update(subscriptions)
      .set({ jobPostingUsed: subscription.jobPostingUsed + 1 })
      .where(eq(subscriptions.id, subscription.id));
    return true;
  }
}
