import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '@ai-job-portal/common';
import { SubscriptionManagementService } from './subscription-management.service';
import { CreatePlanDto, UpdatePlanDto, CancelSubscriptionDto } from './dto';

@ApiTags('Admin - Subscription Management')
@Controller('admin/subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubscriptionManagementController {
  constructor(private readonly subscriptionManagementService: SubscriptionManagementService) {}

  // ==================== SUBSCRIPTION PLANS ====================

  @Get('plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 15 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by plan name' })
  @ApiQuery({
    name: 'billingCycle',
    required: false,
    enum: ['one_time', 'monthly', 'quarterly', 'yearly'],
  })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async listPlans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('billingCycle') billingCycle?: 'one_time' | 'monthly' | 'quarterly' | 'yearly',
  ) {
    return this.subscriptionManagementService.listPlans({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      billingCycle,
    });
  }

  @Get('plans/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get subscription plan details' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string) {
    return this.subscriptionManagementService.getPlan(id);
  }

  @Post('plans')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create new subscription plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionManagementService.createPlan(dto);
  }

  @Put('plans/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionManagementService.updatePlan(id, dto);
  }

  @Post('plans/:id/toggle')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Toggle plan active status' })
  @ApiResponse({ status: 200, description: 'Plan status updated' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async togglePlanStatus(@Param('id') id: string) {
    return this.subscriptionManagementService.togglePlanStatus(id);
  }

  @Delete('plans/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete plan with active subscriptions' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async deletePlan(@Param('id') id: string) {
    return this.subscriptionManagementService.deletePlan(id);
  }

  // ==================== SUBSCRIPTIONS ====================

  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 15 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by employer name or email' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'canceled'],
  })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async listSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'canceled',
  ) {
    return this.subscriptionManagementService.listSubscriptions({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
    });
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscription(@Param('id') id: string) {
    return this.subscriptionManagementService.getSubscription(id);
  }

  @Patch(':id/cancel')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  @ApiResponse({ status: 400, description: 'Subscription already canceled' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(@Param('id') id: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionManagementService.cancelSubscription(id, dto);
  }

  // ==================== PAYMENTS ====================

  @Get('payments')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List all payments' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 15 })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by user name, email, or transaction ID',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'success', 'failed', 'refunded'] })
  @ApiQuery({ name: 'provider', required: false, enum: ['stripe', 'razorpay'] })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async listPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.subscriptionManagementService.listPayments({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      provider,
      fromDate,
      toDate,
    });
  }

  @Get('payments/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('id') id: string) {
    return this.subscriptionManagementService.getPayment(id);
  }
}
