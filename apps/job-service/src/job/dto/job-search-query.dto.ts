import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

import { JobType, CompanyType } from '../enums/job.enums';

export class JobSearchQueryDto {
  @ApiProperty({
    description:
      'Search keyword (required) - searches in title, description, skills, company name, and industry',
    example: 'software developer',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({
    description: 'Filter by experience level',
    example: 'mid',
    required: false,
  })
  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @ApiProperty({
    description: 'Filter by city',
    example: 'Bangalore',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'Filter by state',
    example: 'Karnataka',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'Number of results per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Filter by company name (employer only)',
    example: 'Doe Company',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  // New Filters

  @ApiProperty({
    description: 'Location type preference',
    enum: ['remote', 'exact'],
    required: false,
  })
  @IsString()
  @IsOptional()
  locationType?: 'remote' | 'exact';

  @ApiProperty({
    description: 'Pay rate period',
    enum: ['Hourly', 'Monthly', 'Yearly'],
    required: false,
  })
  @IsString()
  @IsOptional()
  payRate?: 'Hourly' | 'Monthly' | 'Yearly';

  @ApiProperty({
    description: 'Minimum salary',
    example: 50000,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minSalary?: number;

  @ApiProperty({
    description: 'Date posted filter',
    enum: ['24h', '3d', '7d'],
    required: false,
  })
  @IsString()
  @IsOptional()
  postedWithin?: '24h' | '3d' | '7d';

  @ApiProperty({
    description: `Filter by job types. Allowed values: ${Object.values(JobType).join(', ')}`,
    example: [JobType.FULL_TIME, JobType.REMOTE],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(JobType, { each: true, message: 'Invalid job type' })
  jobTypes?: JobType[];

  @ApiProperty({
    description: 'Filter by one or more industries',
    example: ['Technology', 'Healthcare'],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiProperty({
    description: `Filter by company types. Allowed values: ${Object.values(CompanyType).join(', ')}`,
    example: [CompanyType.STARTUP, CompanyType.MNC],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CompanyType, { each: true, message: 'Invalid company type' })
  companyTypes?: CompanyType[];

  @ApiProperty({
    description: 'Filter by departments (e.g. Engineering, Sales, Marketing)',
    example: ['Engineering', 'Product'],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];
}
