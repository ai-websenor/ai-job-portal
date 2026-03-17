import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: 999,
    description:
      'Amount in currency units (e.g. rupees). Converted to paise internally for Stripe.',
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'INR', enum: ['INR', 'USD'] })
  @IsEnum(['INR', 'USD'])
  currency: string;

  @ApiProperty({ example: 'premium', enum: ['premium', 'enterprise', 'job_post', 'featured'] })
  @IsString()
  type: 'premium' | 'enterprise' | 'job_post' | 'featured';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'razorpay', enum: ['razorpay', 'stripe'] })
  @IsEnum(['razorpay', 'stripe'])
  provider: 'razorpay' | 'stripe';

  @ApiPropertyOptional({ description: 'Subscription plan ID (for plan purchase)' })
  @IsOptional()
  @IsString()
  planId?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Gateway order/PaymentIntent ID returned from subscribe' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Gateway payment ID (for Stripe, same as orderId)' })
  @IsString()
  paymentId: string;

  @ApiPropertyOptional({
    description: 'Payment signature (required for Razorpay, ignored for Stripe)',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ enum: ['stripe'], example: 'stripe' })
  @IsEnum(['razorpay', 'stripe'])
  provider: 'razorpay' | 'stripe';
}

export class RefundDto {
  @ApiProperty()
  @IsUUID()
  transactionId: string;

  @ApiPropertyOptional({ description: 'Partial refund amount' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class ListTransactionsDto {
  @ApiPropertyOptional({ enum: ['pending', 'completed', 'failed', 'refunded'] })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'failed', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ enum: ['razorpay', 'stripe'] })
  @IsOptional()
  @IsEnum(['razorpay', 'stripe'])
  provider?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
