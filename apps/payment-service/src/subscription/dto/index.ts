import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Hot Vacancy', description: 'Plan display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Best plan for high-volume hiring with featured listings' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 24999, description: 'Price in smallest currency unit (paise/cents)' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'INR', description: 'Currency code (default: INR)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: 'monthly',
    enum: ['one_time', 'monthly', 'quarterly', 'yearly'],
    description: 'Billing cycle determines subscription duration',
  })
  @IsString()
  billingCycle: string;

  @ApiPropertyOptional({
    example: ['Priority support', 'Analytics dashboard', 'Bulk job upload'],
    type: [String],
    description: 'Feature list for UI display (does not affect limits)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ example: 10, description: 'Maximum job postings allowed per billing cycle' })
  @IsNumber()
  @Min(0)
  jobPostLimit: number;

  @ApiProperty({ example: 100, description: 'Maximum resume/candidate profile views allowed' })
  @IsNumber()
  @Min(0)
  resumeAccessLimit: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum featured job postings allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  featuredJobs?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum number of employers a super_employer can add. NULL = unlimited.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  memberAddingLimit?: number;

  @ApiProperty({
    example: 10,
    description:
      'Plan hierarchy rank for upgrade/downgrade detection. Higher rank = higher tier plan.',
  })
  @IsNumber()
  @Min(0)
  rank: number;

  @ApiPropertyOptional({ example: 1, description: 'Display order on pricing page (lower = first)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Premium Plus' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description for the plan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 29999 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: 'quarterly',
    enum: ['one_time', 'monthly', 'quarterly', 'yearly'],
  })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiPropertyOptional({ example: ['Priority support', 'Analytics'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  jobPostLimit?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  resumeAccessLimit?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  featuredJobs?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum number of employers a super_employer can add. NULL = unlimited.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  memberAddingLimit?: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Plan hierarchy rank for upgrade/downgrade detection. Higher rank = higher tier plan.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rank?: number;

  @ApiPropertyOptional({ example: false, description: 'Set false to hide plan from listing' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class SubscribeDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Plan UUID to subscribe to',
  })
  @IsString()
  planId: string;

  @ApiProperty({ example: 'razorpay', enum: ['razorpay', 'stripe'] })
  @IsEnum(['razorpay', 'stripe'])
  provider: 'razorpay' | 'stripe';
}

export class AdminActivateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'The user ID (users.id, not employers.id) of the employer',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The subscription plan ID to activate',
  })
  @IsString()
  planId: string;
}

export class PreviewChangeDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The subscription plan ID to preview change to',
  })
  @IsString()
  planId: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: 'Switching to a different plan' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'true = cancel now, false = cancel at period end (default)',
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}
