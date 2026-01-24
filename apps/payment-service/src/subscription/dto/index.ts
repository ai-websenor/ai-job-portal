import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'premium' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99900 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 30, description: 'Duration in days' })
  @IsNumber()
  @Min(1)
  durationDays: number;

  @ApiProperty({ example: ['unlimited_applications', 'priority_support'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiPropertyOptional({ example: 10, description: 'Job posting credits included' })
  @IsOptional()
  @IsNumber()
  jobCredits?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubscribeDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['razorpay', 'stripe'] })
  @IsEnum(['razorpay', 'stripe'])
  provider: 'razorpay' | 'stripe';
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Cancel immediately or at period end' })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}
