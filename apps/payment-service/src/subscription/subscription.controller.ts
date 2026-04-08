import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Inject,
  forwardRef,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions, PermissionsGuard, Roles, RolesGuard } from '@ai-job-portal/common';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from '../payment/payment.service';
import { CurrentUserId } from '../decorators/current-user-id.decorator';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CancelSubscriptionDto,
  SubscribeDto,
  AdminActivateDto,
  PreviewChangeDto,
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
            rank: 0,
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create subscription plan (super_admin)' })
  @ApiBody({ type: CreatePlanDto })
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
          rank: 30,
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update subscription plan (super_admin)' })
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  // ─── Admin: Activate Subscription ───────────────────────────

  @Post('admin/activate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('super_admin')
  @ApiBody({ type: AdminActivateDto })
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
          status: 'active',
          transitionType: 'new',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or plan not found' })
  async adminActivate(@Body() dto: AdminActivateDto) {
    return this.subscriptionService.adminActivateSubscription(dto.userId, dto.planId);
  }

  // ─── Preview Change ──────────────────────────────────────────

  @Post('preview-change')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('subscriptions:manage')
  @ApiBody({ type: PreviewChangeDto })
  @ApiOperation({
    summary: 'Preview a plan change (upgrade/downgrade/repurchase)',
    description:
      'Returns transition type, current usage, carry-forward info, and warnings ' +
      'WITHOUT creating a payment. Use this to show the user what will happen before they commit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan change preview generated',
    schema: {
      example: {
        message: 'Plan change preview generated successfully',
        data: {
          transitionType: 'upgrade',
          currentPlan: { id: '...', name: 'Standard', rank: 10, billingCycle: 'one_time' },
          newPlan: {
            id: '...',
            name: 'Hot Vacancy',
            rank: 30,
            price: '1650',
            currency: 'INR',
            billingCycle: 'one_time',
          },
          currentSubscription: {
            id: '...',
            startDate: '2026-03-01T00:00:00.000Z',
            endDate: '2027-03-01T00:00:00.000Z',
          },
          activationBehavior: 'Activates immediately',
          currentUsage: {
            jobPosting: {
              used: 3,
              currentLimit: 5,
              newLimit: 15,
              effectiveLimit: 17,
              remaining: 2,
            },
            resumeAccess: {
              used: 0,
              currentLimit: 1,
              newLimit: 10,
              effectiveLimit: 11,
              remaining: 1,
            },
            featuredJobs: {
              used: 1,
              currentLimit: 1,
              newLimit: 10,
              effectiveLimit: 10,
              remaining: 0,
            },
            highlightedJobs: {
              used: 0,
              currentLimit: 0,
              newLimit: 0,
              effectiveLimit: 0,
              remaining: 0,
            },
          },
          carryForwardCredits: {
            jobPosting: 2,
            resumeAccess: 1,
            featuredJobs: 0,
            highlightedJobs: 0,
          },
          warnings: [],
          existingScheduledPlan: null,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plan not found or no employer profile' })
  async previewChange(@CurrentUserId() userId: string, @Body() dto: PreviewChangeDto) {
    return this.subscriptionService.previewChange(userId, dto.planId);
  }

  // ─── Subscribe (Payment Flow) ──────────────────────────────

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('subscriptions:manage')
  @ApiBody({ type: SubscribeDto })
  @ApiOperation({
    summary: 'Subscribe to a plan (creates Stripe/Razorpay payment order)',
    description:
      'Creates a payment intent/order for the selected plan. ' +
      'For Stripe: returns a clientSecret — use it with Stripe.js confirmPayment() on the frontend. ' +
      'For Razorpay: returns an orderId — use it to open Razorpay checkout. ' +
      'After payment completes, the webhook automatically activates the subscription. ' +
      'Alternatively, call POST /payments/verify for client-side verification. ' +
      'Upgrades activate immediately with carry-forward credits. ' +
      'Downgrades are scheduled to activate after the current plan expires. ' +
      'Same plan repurchase activates immediately with carry-forward credits.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment order created for subscription',
    schema: {
      example: {
        message: 'Subscription payment order created successfully',
        data: {
          paymentId: '880e8400-e29b-41d4-a716-446655440077',
          orderId: 'pi_3abc123def456',
          amount: 24999,
          currency: 'inr',
          provider: 'stripe',
          clientSecret: 'pi_3abc123def456_secret_xyz',
          plan: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Hot Vacancy',
            billingCycle: 'monthly',
          },
          transition: {
            type: 'upgrade',
            activationBehavior: 'Activates immediately',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plan not found or no employer profile' })
  @ApiResponse({ status: 409, description: 'Pending payment already exists for this plan' })
  async subscribe(@CurrentUserId() userId: string, @Body() dto: SubscribeDto) {
    // Validate: employer exists, plan is active, no duplicate pending payments
    const { plan, transitionType } = await this.subscriptionService.validateSubscribeRequest(
      userId,
      dto.planId,
    );

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
        transition: {
          type: transitionType,
          activationBehavior:
            transitionType === 'downgrade'
              ? 'Activates after current plan expires'
              : 'Activates immediately',
        },
      },
    };
  }

  // ─── User Subscription ─────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current active subscription (includes scheduled if any)' })
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
          status: 'active',
        },
        scheduledSubscription: null,
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
    enum: ['job_post', 'resume_access', 'featured_job', 'highlighted_job', 'member_adding'],
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
          { id: '...', plan: 'Free', billingCycle: 'one_time', isActive: false, status: 'expired' },
          {
            id: '...',
            plan: 'Hot Vacancy',
            billingCycle: 'monthly',
            isActive: true,
            status: 'active',
          },
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('subscriptions:manage')
  @ApiBody({ type: CancelSubscriptionDto })
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'immediate=true cancels now. immediate=false (default) cancels at period end. ' +
      'Also cancels any scheduled (downgrade) subscription.',
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
