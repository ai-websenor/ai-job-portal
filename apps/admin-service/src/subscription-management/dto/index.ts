import { IsString, IsNumber, IsEnum, IsArray, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillingCycle {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class CreatePlanDto {
  @ApiProperty({ description: 'Plan name', example: 'Premium' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Price in smallest currency unit', example: 99900 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Currency code', example: 'INR', default: 'INR' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Billing cycle', enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ description: 'Key features array', type: [String] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Job post limit', example: 10 })
  @IsNumber()
  @Min(0)
  jobPostLimit: number;

  @ApiProperty({ description: 'Resume access limit', example: 100 })
  @IsNumber()
  @Min(0)
  resumeAccessLimit: number;

  @ApiProperty({ description: 'Featured jobs count', example: 5, default: 0 })
  @IsNumber()
  @Min(0)
  featuredJobs: number;

  @ApiPropertyOptional({
    description: 'Maximum number of employers a super_employer can add. NULL = unlimited.',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  memberAddingLimit?: number;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ description: 'Plan name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Price in smallest currency unit' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Billing cycle', enum: BillingCycle })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ description: 'Key features array', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({ description: 'Job post limit' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  jobPostLimit?: number;

  @ApiPropertyOptional({ description: 'Resume access limit' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  resumeAccessLimit?: number;

  @ApiPropertyOptional({ description: 'Featured jobs count' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  featuredJobs?: number;

  @ApiPropertyOptional({ description: 'Is plan active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of employers a super_employer can add. NULL = unlimited.',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  memberAddingLimit?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ description: 'Cancel immediately or at period end', default: true })
  @IsBoolean()
  immediate: boolean;
}
