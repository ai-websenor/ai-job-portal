import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Premium' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 24999 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: ['one_time', 'monthly', 'quarterly', 'yearly'] })
  @IsString()
  billingCycle: string;

  @ApiPropertyOptional({ type: [String], description: 'Feature list for UI display' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ example: 10, description: 'Maximum job postings allowed' })
  @IsNumber()
  @Min(0)
  jobPostLimit: number;

  @ApiProperty({ example: 100, description: 'Maximum resume/candidate views allowed' })
  @IsNumber()
  @Min(0)
  resumeAccessLimit: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum featured job postings allowed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  featuredJobs?: number;

  @ApiPropertyOptional({ example: 0, description: 'Display order for plan listing' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

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
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: ['one_time', 'monthly', 'quarterly', 'yearly'] })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  jobPostLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  resumeAccessLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  featuredJobs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class SubscribeDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['razorpay', 'stripe'] })
  @IsEnum(['razorpay', 'stripe'])
  provider: 'razorpay' | 'stripe';
}

export class AdminActivateDto {
  @ApiProperty({ description: 'The user ID (users.id) of the employer' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'The plan ID to activate' })
  @IsString()
  planId: string;
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
