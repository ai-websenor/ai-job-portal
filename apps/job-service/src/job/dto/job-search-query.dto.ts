import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

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
    description: 'Filter by job type',
    example: 'full_time',
    required: false,
  })
  @IsString()
  @IsOptional()
  jobType?: string;

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
}
