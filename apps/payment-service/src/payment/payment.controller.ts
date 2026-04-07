import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';
import { PaymentService } from './payment.service';
import { CreateOrderDto, VerifyPaymentDto, RefundDto, ListTransactionsDto } from './dto';
import { CurrentUserId } from '../decorators/current-user-id.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('order')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('MANAGE_SUBSCRIPTIONS')
  @ApiOperation({ summary: 'Create payment order (Razorpay or Stripe)' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        message: 'Payment order created successfully',
        data: {
          paymentId: '880e8400-e29b-41d4-a716-446655440077',
          orderId: 'order_Pxyz123456',
          amount: 24999,
          currency: 'INR',
          provider: 'razorpay',
        },
      },
    },
  })
  async createOrder(@CurrentUserId() userId: string, @Body() dto: CreateOrderDto) {
    return this.paymentService.createOrder(userId, dto);
  }

  @Post('verify')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('MANAGE_SUBSCRIPTIONS')
  @ApiOperation({
    summary: 'Verify payment completion',
    description:
      'Call after the user completes payment on the gateway. ' +
      'For Stripe: pass the PaymentIntent ID as both orderId and paymentId. ' +
      'For Razorpay: pass orderId, paymentId, and signature from the checkout callback.',
  })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment verified and subscription activated',
    schema: {
      example: {
        message: 'Payment verified and subscription activated',
        data: {
          transactionId: '880e8400-e29b-41d4-a716-446655440077',
          status: 'success',
          subscriptionActivated: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payment verification failed or signature mismatch' })
  async verifyPayment(@CurrentUserId() userId: string, @Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(userId, dto);
  }

  @Post('refund')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('MANAGE_SUBSCRIPTIONS')
  @ApiOperation({ summary: 'Request a refund for a transaction' })
  @ApiBody({ type: RefundDto })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      example: {
        message: 'Refund processed successfully',
        data: {
          transactionId: '880e8400-e29b-41d4-a716-446655440077',
          refundId: 'rfnd_Pxyz123456',
          amount: 999,
          status: 'refunded',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async refund(@CurrentUserId() userId: string, @Body() dto: RefundDto) {
    return this.paymentService.refund(userId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List user transactions with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'success', 'failed', 'refunded'] })
  @ApiQuery({ name: 'provider', required: false, enum: ['razorpay', 'stripe'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Transactions fetched successfully',
    schema: {
      example: {
        message: 'Transactions fetched successfully',
        data: [
          {
            id: '880e8400-e29b-41d4-a716-446655440077',
            orderId: 'order_Pxyz123456',
            amount: '24999',
            currency: 'INR',
            status: 'success',
            provider: 'razorpay',
            type: 'premium',
            createdAt: '2026-03-10T10:00:00.000Z',
          },
        ],
        pagination: { totalTransaction: 5, pageCount: 1, currentPage: 1, hasNextPage: false },
      },
    },
  })
  async listTransactions(@CurrentUserId() userId: string, @Query() dto: ListTransactionsDto) {
    return this.paymentService.listTransactions(userId, dto);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID',
    example: '880e8400-e29b-41d4-a716-446655440077',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction fetched successfully',
    schema: {
      example: {
        message: 'Transaction fetched successfully',
        data: {
          id: '880e8400-e29b-41d4-a716-446655440077',
          orderId: 'order_Pxyz123456',
          paymentId: 'pay_Pxyz789012',
          amount: '24999',
          currency: 'INR',
          status: 'success',
          provider: 'razorpay',
          type: 'premium',
          planId: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2026-03-10T10:00:00.000Z',
          updatedAt: '2026-03-10T10:05:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.paymentService.getTransaction(userId, id);
  }
}
