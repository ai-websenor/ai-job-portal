import { IsArray, IsOptional, IsBoolean, IsEnum, IsNumber, IsString, Min, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobPreferencesDto {
  @ApiPropertyOptional({ type: [String], description: 'Array of job types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Array of preferred locations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalaryMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalaryMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 10)
  salaryCurrency?: string;

  @ApiPropertyOptional({ enum: ['immediate', '15_days', '1_month', '2_months', '3_months'] })
  @IsOptional()
  @IsEnum(['immediate', '15_days', '1_month', '2_months', '3_months'])
  noticePeriod?: 'immediate' | '15_days' | '1_month' | '2_months' | '3_months';

  @ApiPropertyOptional({ type: [String], description: 'Array of preferred industries' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIndustries?: string[];

  @ApiPropertyOptional({ enum: ['day', 'night', 'rotational', 'flexible'] })
  @IsOptional()
  @IsEnum(['day', 'night', 'rotational', 'flexible'])
  workShift?: 'day' | 'night' | 'rotational' | 'flexible';

  @ApiPropertyOptional({ enum: ['actively_looking', 'open_to_opportunities', 'not_looking'] })
  @IsOptional()
  @IsEnum(['actively_looking', 'open_to_opportunities', 'not_looking'])
  jobSearchStatus?: 'actively_looking' | 'open_to_opportunities' | 'not_looking';
}
