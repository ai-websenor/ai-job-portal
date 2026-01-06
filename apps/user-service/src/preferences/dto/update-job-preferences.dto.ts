import {
  IsArray,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  Min,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobPreferencesDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['full_time', 'remote'],
    description: 'Preferred job types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Bengaluru', 'Hyderabad'],
    description: 'Preferred job locations',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Willing to relocate for a job',
  })
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional({
    example: 800000,
    description: 'Minimum expected annual salary',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalaryMin?: number;

  @ApiPropertyOptional({
    example: 1200000,
    description: 'Maximum expected annual salary',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalaryMax?: number;

  @ApiPropertyOptional({
    example: 'INR',
    description: 'Salary currency code',
  })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  salaryCurrency?: string;

  @ApiPropertyOptional({
    example: 1000000,
    description: 'Expected annual salary (single value for target salary)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalary?: number;

  @ApiPropertyOptional({
    enum: ['immediate', '15_days', '1_month', '2_months', '3_months'],
    example: '1_month',
    description: 'Notice period before joining',
  })
  @IsOptional()
  @IsEnum(['immediate', '15_days', '1_month', '2_months', '3_months'])
  noticePeriod?: 'immediate' | '15_days' | '1_month' | '2_months' | '3_months';

  @ApiPropertyOptional({
    type: [String],
    example: ['IT Services', 'FinTech'],
    description: 'Preferred industries',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIndustries?: string[];

  @ApiPropertyOptional({
    enum: ['day', 'night', 'rotational', 'flexible'],
    example: 'flexible',
    description: 'Preferred work shift',
  })
  @IsOptional()
  @IsEnum(['day', 'night', 'rotational', 'flexible'])
  workShift?: 'day' | 'night' | 'rotational' | 'flexible';

  @ApiPropertyOptional({
    enum: ['actively_looking', 'open_to_opportunities', 'not_looking'],
    example: 'actively_looking',
    description: 'Current job search status',
  })
  @IsOptional()
  @IsEnum(['actively_looking', 'open_to_opportunities', 'not_looking'])
  jobSearchStatus?: 'actively_looking' | 'open_to_opportunities' | 'not_looking';
}
