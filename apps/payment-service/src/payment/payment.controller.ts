import { Controller, Post, Get, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreateOrderDto, VerifyPaymentDto, RefundDto, ListTransactionsDto } from './dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('order')
  @ApiOperation({ summary: 'Create payment order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.paymentService.createOrder(userId, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify payment completion' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPayment(
    @Headers('x-user-id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment(userId, dto);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Request refund' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async refund(
    @Headers('x-user-id') userId: string,
    @Body() dto: RefundDto,
  ) {
    return this.paymentService.refund(userId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List user transactions' })
  async listTransactions(
    @Headers('x-user-id') userId: string,
    @Query() dto: ListTransactionsDto,
  ) {
    return this.paymentService.listTransactions(userId, dto);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction details' })
  async getTransaction(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.paymentService.getTransaction(userId, id);
  }
}
