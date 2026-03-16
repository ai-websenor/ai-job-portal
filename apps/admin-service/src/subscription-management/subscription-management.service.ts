import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, ilike, desc, sql, gte, lte } from 'drizzle-orm';
import { Database } from '@ai-job-portal/database';
import {
  subscriptionPlans,
  subscriptions,
  employers,
  payments,
  users,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionManagementService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // ==================== SUBSCRIPTION PLANS ====================

  async listPlans(query: {
    page?: number;
    limit?: number;
    search?: string;
    billingCycle?: 'one_time' | 'monthly' | 'quarterly' | 'yearly';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.search) {
      conditions.push(ilike(subscriptionPlans.name, `%${query.search}%`));
    }

    if (query.billingCycle) {
      conditions.push(eq(subscriptionPlans.billingCycle, query.billingCycle));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(subscriptionPlans)
        .where(whereClause)
        .orderBy(desc(subscriptionPlans.sortOrder), desc(subscriptionPlans.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptionPlans)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Parse JSON features field for each plan
    const parsedData = data.map((plan) => ({
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    }));

    return {
      data: parsedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getPlan(id: string) {
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, id),
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Parse JSON features field
    return {
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    };
  }

  async createPlan(dto: CreatePlanDto) {
    // Generate slug from name
    const slug = dto.name.toLowerCase().replace(/\s+/g, '-');

    const [newPlan] = await this.db
      .insert(subscriptionPlans)
      .values({
        name: dto.name,
        slug,
        description: dto.description || null,
        price: dto.price.toString(),
        currency: dto.currency,
        billingCycle: dto.billingCycle,
        features: JSON.stringify(dto.features),
        jobPostLimit: dto.jobPostLimit,
        resumeAccessLimit: dto.resumeAccessLimit,
        featuredJobs: dto.featuredJobs || 0,
        memberAddingLimit: dto.memberAddingLimit ?? null,
        sortOrder: dto.sortOrder || 0,
        isActive: true,
      })
      .returning();

    // Parse JSON features field
    return {
      ...newPlan,
      features:
        typeof newPlan.features === 'string' ? JSON.parse(newPlan.features) : newPlan.features,
    };
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const _plan = await this.getPlan(id);

    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = dto.name.toLowerCase().replace(/\s+/g, '-');
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price.toString();
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.billingCycle !== undefined) updateData.billingCycle = dto.billingCycle;
    if (dto.features !== undefined) updateData.features = JSON.stringify(dto.features);
    if (dto.jobPostLimit !== undefined) updateData.jobPostLimit = dto.jobPostLimit;
    if (dto.resumeAccessLimit !== undefined) updateData.resumeAccessLimit = dto.resumeAccessLimit;
    if (dto.featuredJobs !== undefined) updateData.featuredJobs = dto.featuredJobs;
    if (dto.memberAddingLimit !== undefined) updateData.memberAddingLimit = dto.memberAddingLimit;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    updateData.updatedAt = new Date();

    const [updatedPlan] = await this.db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();

    // Parse JSON features field
    return {
      ...updatedPlan,
      features:
        typeof updatedPlan.features === 'string'
          ? JSON.parse(updatedPlan.features)
          : updatedPlan.features,
    };
  }

  async togglePlanStatus(id: string) {
    const plan = await this.getPlan(id);

    const [updatedPlan] = await this.db
      .update(subscriptionPlans)
      .set({
        isActive: !plan.isActive,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, id))
      .returning();

    // Parse JSON features field
    return {
      ...updatedPlan,
      features:
        typeof updatedPlan.features === 'string'
          ? JSON.parse(updatedPlan.features)
          : updatedPlan.features,
    };
  }

  async deletePlan(id: string) {
    const _plan = await this.getPlan(id);

    // Check if any active subscriptions are using this plan
    const activeSubscriptions = await this.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.planId, id), eq(subscriptions.isActive, true)))
      .limit(1);

    if (activeSubscriptions.length > 0) {
      throw new BadRequestException(
        'Cannot delete plan with active subscriptions. Deactivate the plan instead.',
      );
    }

    await this.db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));

    return { message: 'Plan deleted successfully' };
  }

  // ==================== SUBSCRIPTIONS ====================

  async listSubscriptions(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'canceled';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status === 'active') {
      conditions.push(
        and(eq(subscriptions.isActive, true), sql`${subscriptions.canceledAt} IS NULL`),
      );
    } else if (query.status === 'inactive') {
      conditions.push(eq(subscriptions.isActive, false));
    } else if (query.status === 'canceled') {
      conditions.push(sql`${subscriptions.canceledAt} IS NOT NULL`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: subscriptions.id,
          employerId: subscriptions.employerId,
          plan: subscriptions.plan,
          planId: subscriptions.planId,
          billingCycle: subscriptions.billingCycle,
          amount: subscriptions.amount,
          currency: subscriptions.currency,
          startDate: subscriptions.startDate,
          endDate: subscriptions.endDate,
          autoRenew: subscriptions.autoRenew,
          jobPostingLimit: subscriptions.jobPostingLimit,
          jobPostingUsed: subscriptions.jobPostingUsed,
          featuredJobsLimit: subscriptions.featuredJobsLimit,
          featuredJobsUsed: subscriptions.featuredJobsUsed,
          resumeAccessLimit: subscriptions.resumeAccessLimit,
          resumeAccessUsed: subscriptions.resumeAccessUsed,
          highlightedJobsLimit: subscriptions.highlightedJobsLimit,
          highlightedJobsUsed: subscriptions.highlightedJobsUsed,
          isActive: subscriptions.isActive,
          canceledAt: subscriptions.canceledAt,
          paymentId: subscriptions.paymentId,
          createdAt: subscriptions.createdAt,
          updatedAt: subscriptions.updatedAt,
          employer: {
            id: employers.id,
            firstName: employers.firstName,
            lastName: employers.lastName,
            email: employers.email,
          },
        })
        .from(subscriptions)
        .leftJoin(employers, eq(subscriptions.employerId, employers.id))
        .where(whereClause)
        .orderBy(desc(subscriptions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(whereClause),
    ]);

    // Apply search filter on employer data (post-query)
    let filteredData = data;
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredData = data.filter((sub) => {
        const employerName =
          `${sub.employer?.firstName || ''} ${sub.employer?.lastName || ''}`.toLowerCase();
        const employerEmail = sub.employer?.email?.toLowerCase() || '';
        return employerName.includes(searchLower) || employerEmail.includes(searchLower);
      });
    }

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: filteredData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getSubscription(id: string) {
    const subscription = await this.db
      .select({
        id: subscriptions.id,
        employerId: subscriptions.employerId,
        plan: subscriptions.plan,
        planId: subscriptions.planId,
        billingCycle: subscriptions.billingCycle,
        amount: subscriptions.amount,
        currency: subscriptions.currency,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        autoRenew: subscriptions.autoRenew,
        jobPostingLimit: subscriptions.jobPostingLimit,
        jobPostingUsed: subscriptions.jobPostingUsed,
        featuredJobsLimit: subscriptions.featuredJobsLimit,
        featuredJobsUsed: subscriptions.featuredJobsUsed,
        resumeAccessLimit: subscriptions.resumeAccessLimit,
        resumeAccessUsed: subscriptions.resumeAccessUsed,
        highlightedJobsLimit: subscriptions.highlightedJobsLimit,
        highlightedJobsUsed: subscriptions.highlightedJobsUsed,
        isActive: subscriptions.isActive,
        canceledAt: subscriptions.canceledAt,
        paymentId: subscriptions.paymentId,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        employer: {
          id: employers.id,
          firstName: employers.firstName,
          lastName: employers.lastName,
          email: employers.email,
        },
      })
      .from(subscriptions)
      .leftJoin(employers, eq(subscriptions.employerId, employers.id))
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (!subscription || subscription.length === 0) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription[0];
  }

  async cancelSubscription(id: string, dto: CancelSubscriptionDto) {
    const subscription = await this.getSubscription(id);

    if (subscription.canceledAt) {
      throw new BadRequestException('Subscription is already canceled');
    }

    const updateData: any = {
      canceledAt: new Date(),
      updatedAt: new Date(),
    };

    if (dto.immediate) {
      updateData.isActive = false;
      updateData.autoRenew = false;
    } else {
      updateData.autoRenew = false;
    }

    const [updatedSubscription] = await this.db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning();

    return updatedSubscription;
  }

  // ==================== PAYMENTS ====================

  async listPayments(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    provider?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(payments.status, query.status as any));
    }

    if (query.provider) {
      conditions.push(eq(payments.paymentGateway, query.provider));
    }

    if (query.fromDate) {
      conditions.push(gte(payments.createdAt, new Date(query.fromDate)));
    }

    if (query.toDate) {
      const toDate = new Date(query.toDate);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(payments.createdAt, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: payments.id,
          userId: payments.userId,
          amount: payments.amount,
          currency: payments.currency,
          status: payments.status,
          paymentMethod: payments.paymentMethod,
          paymentGateway: payments.paymentGateway,
          transactionId: payments.transactionId,
          gatewayOrderId: payments.gatewayOrderId,
          gatewayPaymentId: payments.gatewayPaymentId,
          metadata: payments.metadata,
          subscriptionId: payments.subscriptionId,
          discountAmount: payments.discountAmount,
          taxAmount: payments.taxAmount,
          refundAmount: payments.refundAmount,
          refundedAt: payments.refundedAt,
          retryCount: payments.retryCount,
          createdAt: payments.createdAt,
          updatedAt: payments.updatedAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(whereClause),
    ]);

    // Apply search filter on user data (post-query)
    let filteredData = data;
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredData = data.filter((p) => {
        const userName = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
        const userEmail = p.user?.email?.toLowerCase() || '';
        const txnId = p.transactionId?.toLowerCase() || '';
        const gatewayOrderId = p.gatewayOrderId?.toLowerCase() || '';
        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          txnId.includes(searchLower) ||
          gatewayOrderId.includes(searchLower)
        );
      });
    }

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Parse metadata JSON
    const parsedData = filteredData.map((p) => ({
      ...p,
      metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata,
    }));

    return {
      data: parsedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getPayment(id: string) {
    const result = await this.db
      .select({
        id: payments.id,
        userId: payments.userId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        paymentGateway: payments.paymentGateway,
        transactionId: payments.transactionId,
        gatewayOrderId: payments.gatewayOrderId,
        gatewayPaymentId: payments.gatewayPaymentId,
        metadata: payments.metadata,
        subscriptionId: payments.subscriptionId,
        discountAmount: payments.discountAmount,
        taxAmount: payments.taxAmount,
        refundAmount: payments.refundAmount,
        refundedAt: payments.refundedAt,
        retryCount: payments.retryCount,
        billingAddress: payments.billingAddress,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .where(eq(payments.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      throw new NotFoundException('Payment not found');
    }

    const payment = result[0];
    return {
      ...payment,
      metadata:
        typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata,
    };
  }
}
