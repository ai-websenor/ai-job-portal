import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 99900, description: 'Amount in smallest currency unit' })
  @IsNumber()
  @Min(100)
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
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  paymentId: string;

  @ApiProperty()
  @IsString()
  signature: string;

  @ApiProperty({ enum: ['razorpay', 'stripe'] })
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
