import { Controller, Get, Post, Put, Body, Param, Query, Inject, forwardRef } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from '../payment/payment.service';
import { CurrentUserId } from '../decorators/current-user-id.decorator';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CancelSubscriptionDto,
  SubscribeDto,
  AdminActivateDto,
  UpgradePlanDto,
} from './dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // ─── Public Plans ────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans (public)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Admin only: include disabled plans',
  })
  @ApiResponse({
    status: 200,
    description: 'Plans fetched successfully',
    schema: {
      example: {
        message: 'Subscription plans fetched successfully',
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Free',
            slug: 'free',
            price: '0',
            currency: 'INR',
            billingCycle: 'one_time',
            jobPostLimit: 1,
            resumeAccessLimit: 5,
            featuredJobs: 0,
            features: ['1 job posting', '5 resume views'],
            isActive: true,
            sortOrder: 0,
          },
        ],
        pagination: { totalPlan: 3, pageCount: 1, currentPage: 1, hasNextPage: false },
      },
    },
  })
  async listPlans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.subscriptionService.listPlans({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan details by ID' })
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Plan fetched successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string) {
    return this.subscriptionService.getPlan(id);
  }

  // ─── Admin Plan Management ──────────────────────────────────

  @Post('plans')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription plan (super_admin)' })
  @ApiResponse({
    status: 201,
    description: 'Plan created successfully',
    schema: {
      example: {
        message: 'Plan created successfully',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Hot Vacancy',
          slug: 'hot-vacancy',
          price: '24999',
          billingCycle: 'monthly',
          jobPostLimit: 10,
          resumeAccessLimit: 100,
          featuredJobs: 5,
          features: ['Priority support', 'Analytics dashboard'],
          isActive: true,
        },
      },
    },
  })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  @Put('plans/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription plan (super_admin)' })
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  // ─── Admin: Activate Subscription ───────────────────────────

  @Post('admin/activate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: activate subscription for an employer (no payment required)',
    description:
      'Directly assigns a plan to an employer. Deactivates any existing subscription. ' +
      'Use this for testing, complimentary plans, or manual assignments. ' +
      'Note: userId must be users.id (from JWT), not employers.id.',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription activated successfully',
    schema: {
      example: {
        message: 'Subscription activated successfully by admin',
        data: {
          id: '660e8400-e29b-41d4-a716-446655440099',
          employerId: '770e8400-e29b-41d4-a716-446655440088',
          planId: '550e8400-e29b-41d4-a716-446655440000',
          plan: 'Hot Vacancy',
          billingCycle: 'monthly',
          amount: '24999',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-04-09T00:00:00.000Z',
          jobPostingLimit: 10,
          jobPostingUsed: 0,
          resumeAccessLimit: 100,
          resumeAccessUsed: 0,
          featuredJobsLimit: 5,
          featuredJobsUsed: 0,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or plan not found' })
  async adminActivate(@Body() dto: AdminActivateDto) {
    return this.subscriptionService.adminActivateSubscription(dto.userId, dto.planId);
  }

  // ─── Subscribe (Payment Flow) ──────────────────────────────

  @Post('subscribe')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Subscribe to a plan (creates payment order for checkout)',
    description:
      'Returns a Razorpay/Stripe payment order. Frontend opens checkout with the orderId, then calls POST /payments/verify after success.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment order created for subscription',
    schema: {
      example: {
        message: 'Subscription payment order created successfully',
        data: {
          paymentId: '880e8400-e29b-41d4-a716-446655440077',
          orderId: 'order_NxR12abc456',
          amount: 24999,
          currency: 'INR',
          provider: 'razorpay',
          plan: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Hot Vacancy',
            billingCycle: 'monthly',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async subscribe(@CurrentUserId() userId: string, @Body() dto: SubscribeDto) {
    const { data: plan } = await this.subscriptionService.getPlan(dto.planId);

    const orderResult = await this.paymentService.createOrder(userId, {
      amount: Number(plan.price),
      currency: plan.currency || 'INR',
      type: 'premium',
      provider: dto.provider,
      planId: dto.planId,
    });

    return {
      message: 'Subscription payment order created successfully',
      data: {
        ...orderResult.data,
        plan: {
          id: plan.id,
          name: plan.name,
          billingCycle: plan.billingCycle,
        },
      },
    };
  }

  // ─── Upgrade (No Payment – Temporary) ─────────────────────

  @Post('upgrade')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upgrade subscription plan (no payment required)',
    description:
      'Employer selects a plan and it is activated immediately without payment. ' +
      'Deactivates any existing subscription. ' +
      'This is a temporary endpoint until payment integration is completed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Plan upgraded successfully',
    schema: {
      example: {
        message: 'Plan upgraded successfully',
        data: {
          id: '660e8400-e29b-41d4-a716-446655440099',
          employerId: '770e8400-e29b-41d4-a716-446655440088',
          planId: '550e8400-e29b-41d4-a716-446655440000',
          plan: 'Hot Vacancy',
          billingCycle: 'monthly',
          amount: '24999',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-04-09T00:00:00.000Z',
          jobPostingLimit: 10,
          jobPostingUsed: 0,
          resumeAccessLimit: 100,
          resumeAccessUsed: 0,
          featuredJobsLimit: 5,
          featuredJobsUsed: 0,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plan not found or no employer profile' })
  async upgradePlan(@CurrentUserId() userId: string, @Body() dto: UpgradePlanDto) {
    const result = await this.subscriptionService.adminActivateSubscription(userId, dto.planId);
    return {
      message: 'Plan upgraded successfully',
      data: result.data,
    };
  }

  // ─── User Subscription ─────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription fetched successfully',
    schema: {
      example: {
        message: 'Active subscription fetched successfully',
        data: {
          id: '660e8400-e29b-41d4-a716-446655440099',
          plan: 'Hot Vacancy',
          billingCycle: 'monthly',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-04-09T00:00:00.000Z',
          jobPostingLimit: 10,
          jobPostingUsed: 3,
          resumeAccessLimit: 100,
          resumeAccessUsed: 12,
          featuredJobsLimit: 5,
          featuredJobsUsed: 1,
          isActive: true,
        },
      },
    },
  })
  async getMySubscription(@CurrentUserId() userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('me/usage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription usage details (all limits, used, remaining)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription usage fetched successfully',
    schema: {
      example: {
        message: 'Subscription usage fetched successfully',
        data: {
          planName: 'Hot Vacancy',
          billingCycle: 'monthly',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-04-09T00:00:00.000Z',
          usage: {
            jobPosting: { limit: 10, used: 3, remaining: 7 },
            featuredJobs: { limit: 5, used: 1, remaining: 4 },
            resumeAccess: { limit: 100, used: 12, remaining: 88 },
            highlightedJobs: { limit: 0, used: 0, remaining: 0 },
          },
        },
      },
    },
  })
  async getSubscriptionUsage(@CurrentUserId() userId: string) {
    return this.subscriptionService.getSubscriptionUsage(userId);
  }

  @Get('me/credits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get remaining job posting credits (quick check)' })
  @ApiResponse({
    status: 200,
    description: 'Credits fetched successfully',
    schema: {
      example: { message: 'Remaining credits fetched successfully', data: { credits: 7 } },
    },
  })
  async getRemainingCredits(@CurrentUserId() userId: string) {
    return this.subscriptionService.getRemainingCredits(userId);
  }

  @Get('me/feature/:feature')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if employer has access to a specific feature' })
  @ApiParam({
    name: 'feature',
    enum: ['job_post', 'resume_access', 'featured_job', 'highlighted_job'],
    example: 'job_post',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature access checked',
    schema: {
      example: {
        message: 'Feature access checked',
        data: { feature: 'job_post', hasAccess: true, remaining: 7 },
      },
    },
  })
  async checkFeatureAccess(@CurrentUserId() userId: string, @Param('feature') feature: string) {
    return this.subscriptionService.checkFeatureAccess(userId, feature);
  }

  @Get('me/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription history (all past and current subscriptions)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Subscription history fetched successfully',
    schema: {
      example: {
        message: 'Subscription history fetched successfully',
        data: [
          { id: '...', plan: 'Free', billingCycle: 'one_time', isActive: false },
          { id: '...', plan: 'Hot Vacancy', billingCycle: 'monthly', isActive: true },
        ],
        pagination: { totalSubscription: 2, pageCount: 1, currentPage: 1, hasNextPage: false },
      },
    },
  })
  async getSubscriptionHistory(
    @CurrentUserId() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subscriptionService.getSubscriptionHistory(userId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('me/cancel')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'immediate=true cancels now. immediate=false (default) cancels at period end.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled',
    schema: {
      example: {
        message: 'Subscription will be canceled at period end',
        data: {
          id: '...',
          isActive: true,
          autoRenew: false,
          canceledAt: '2026-03-10T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async cancelSubscription(@CurrentUserId() userId: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionService.cancelSubscription(userId, dto);
  }
}
