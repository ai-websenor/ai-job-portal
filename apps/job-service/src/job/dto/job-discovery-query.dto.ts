import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class JobDiscoveryQueryDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Number of jobs to return per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 'Engineering',
    description: 'Filter by category (Slug or UUID)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'Filter by location (City, State, or Location)',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-company',
    description: 'Filter by company ID',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'Tech Corp',
    description: 'Filter by company name (partial match, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'Technology',
    description: 'Filter by industry',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    example: 'startup',
    description: 'Filter by company type',
    enum: ['startup', 'sme', 'mnc', 'government'],
  })
  @IsOptional()
  @IsString()
  companyType?: string;
}
