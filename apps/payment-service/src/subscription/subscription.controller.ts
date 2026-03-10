import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from '../payment/payment.service';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto, SubscribeDto } from './dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // Public plans endpoints (no auth required)
  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Plans fetched successfully' })
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
  @ApiOperation({ summary: 'Get plan details' })
  @ApiResponse({ status: 200, description: 'Plan fetched successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string) {
    return this.subscriptionService.getPlan(id);
  }

  // Admin plan management
  @Post('plans')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription plan (admin)' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  @Put('plans/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription plan (admin)' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  // Subscribe (purchase a plan)
  @Post('subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan — creates payment order for frontend checkout' })
  @ApiResponse({ status: 201, description: 'Payment order created for subscription' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async subscribe(@Headers('x-user-id') userId: string, @Body() dto: SubscribeDto) {
    // Fetch plan to get price/currency
    const { data: plan } = await this.subscriptionService.getPlan(dto.planId);

    // Create payment order with planId in metadata
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

  // User subscription management
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription fetched successfully' })
  async getMySubscription(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('me/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Subscription history fetched successfully' })
  async getSubscriptionHistory(
    @Headers('x-user-id') userId: string,
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
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async cancelSubscription(
    @Headers('x-user-id') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(userId, dto);
  }

  @Get('me/credits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get remaining job posting credits' })
  @ApiResponse({ status: 200, description: 'Credits fetched successfully' })
  async getRemainingCredits(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getRemainingCredits(userId);
  }

  @Get('me/usage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription usage details (all limits and usage)' })
  @ApiResponse({ status: 200, description: 'Subscription usage fetched successfully' })
  async getSubscriptionUsage(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getSubscriptionUsage(userId);
  }

  @Get('me/feature/:feature')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check feature access (job_post, resume_access, featured_job, highlighted_job)',
  })
  @ApiResponse({ status: 200, description: 'Feature access checked' })
  async checkFeatureAccess(
    @Headers('x-user-id') userId: string,
    @Param('feature') feature: string,
  ) {
    return this.subscriptionService.checkFeatureAccess(userId, feature);
  }
}
