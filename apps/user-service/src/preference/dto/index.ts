import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum JobSearchStatus {
  ACTIVELY_LOOKING = 'actively_looking',
  OPEN_TO_OPPORTUNITIES = 'open_to_opportunities',
  NOT_LOOKING = 'not_looking',
}

export enum WorkShift {
  DAY = 'day',
  NIGHT = 'night',
  ROTATIONAL = 'rotational',
  FLEXIBLE = 'flexible',
}

export class CreateJobPreferenceDto {
  @ApiProperty({ description: 'Preferred job types (comma-separated)', example: 'full_time,contract' })
  @IsString()
  jobTypes: string;

  @ApiProperty({ description: 'Preferred locations (comma-separated)', example: 'Bangalore,Remote' })
  @IsString()
  preferredLocations: string;

  @ApiPropertyOptional({ description: 'Preferred industries (comma-separated)' })
  @IsOptional()
  @IsString()
  preferredIndustries?: string;

  @ApiPropertyOptional({ description: 'Willing to relocate' })
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional({ description: 'Expected salary' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  expectedSalary?: number;

  @ApiPropertyOptional({ description: 'Minimum expected salary' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  expectedSalaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum expected salary' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  expectedSalaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency', default: 'INR' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({ description: 'Preferred work shift', enum: WorkShift })
  @IsOptional()
  @IsEnum(WorkShift)
  workShift?: WorkShift;

  @ApiPropertyOptional({ description: 'Job search status', enum: JobSearchStatus })
  @IsOptional()
  @IsEnum(JobSearchStatus)
  jobSearchStatus?: JobSearchStatus;

  @ApiPropertyOptional({ description: 'Notice period in days', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  @Type(() => Number)
  noticePeriodDays?: number;
}

export class UpdateJobPreferenceDto extends PartialType(CreateJobPreferenceDto) {}

export class UserPreferenceDto {
  @ApiPropertyOptional({ description: 'Theme preference', example: 'dark' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ description: 'Language preference', example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}
