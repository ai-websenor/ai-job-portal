import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Public plans endpoint
  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  async listPlans(@Query('includeInactive') includeInactive?: boolean) {
    return this.subscriptionService.listPlans(includeInactive);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan details' })
  async getPlan(@Param('id') id: string) {
    return this.subscriptionService.getPlan(id);
  }

  // Admin plan management
  @Post('plans')
  @ApiOperation({ summary: 'Create subscription plan (admin)' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update subscription plan (admin)' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  // User subscription management
  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get subscription history' })
  async getSubscriptionHistory(@Headers('x-user-id') userId: string) {
    return this.subscriptionService.getSubscriptionHistory(userId);
  }

  @Post('me/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @Headers('x-user-id') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(userId, dto);
  }

  @Get('me/credits')
  @ApiOperation({ summary: 'Get remaining job posting credits' })
  async getRemainingCredits(@Headers('x-user-id') userId: string) {
    const credits = await this.subscriptionService.getRemainingCredits(userId);
    return { credits };
  }

  @Get('me/feature/:feature')
  @ApiOperation({ summary: 'Check feature access' })
  async checkFeatureAccess(
    @Headers('x-user-id') userId: string,
    @Param('feature') feature: string,
  ) {
    const hasAccess = await this.subscriptionService.checkFeatureAccess(userId, feature);
    return { feature, hasAccess };
  }
}
