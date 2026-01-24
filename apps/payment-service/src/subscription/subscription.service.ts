import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, gte } from 'drizzle-orm';
import { Database, subscriptionPlans, subscriptions, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  // Plan Management (Admin)
  async createPlan(dto: CreatePlanDto) {
    const [plan] = await this.db.insert(subscriptionPlans).values({
      name: dto.name,
      slug: dto.name.toLowerCase().replace(/\s+/g, '-'),
      description: dto.description,
      price: dto.price,
      currency: dto.currency || 'INR',
      features: dto.features ? JSON.stringify(dto.features) : null,
      isActive: true,
    } as any).returning();

    return plan;
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const updateData: any = { ...dto, updatedAt: new Date() };
    if (dto.features) {
      updateData.features = JSON.stringify(dto.features);
    }
    const [updated] = await this.db.update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Plan not found');
    }

    return updated;
  }

  async listPlans(includeInactive = false) {
    if (includeInactive) {
      return this.db.query.subscriptionPlans.findMany({
        orderBy: [desc(subscriptionPlans.price)],
      });
    }

    return this.db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: [desc(subscriptionPlans.price)],
    });
  }

  async getPlan(planId: string) {
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
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

    return subscription;
  }

  async getSubscriptionHistory(userId: string) {
    return (this.db.query as any).subscriptions.findMany({
      where: eq(subscriptions.employerId, userId),
      with: {
        plan: true,
      },
      orderBy: [desc(subscriptions.createdAt)],
    });
  }

  async cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    const subscription = await (this.db.query as any).subscriptions.findFirst({
      where: and(
        eq(subscriptions.employerId, userId),
        eq(subscriptions.isActive, true),
      ),
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

    const [updated] = await this.db.update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    return updated;
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return false;
    }

    const plan = await this.getPlan(subscription.planId);
    const features = plan.features ? JSON.parse(plan.features) : [];
    return Array.isArray(features) && features.includes(feature);
  }

  async getRemainingCredits(userId: string): Promise<number> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return 0;
    return subscription.jobPostingLimit - subscription.jobPostingUsed;
  }

  async useCredit(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      return false;
    }
    if (subscription.jobPostingUsed >= subscription.jobPostingLimit) {
      return false;
    }
    await this.db.update(subscriptions)
      .set({ jobPostingUsed: subscription.jobPostingUsed + 1 })
      .where(eq(subscriptions.id, subscription.id));
    return true;
  }
}
