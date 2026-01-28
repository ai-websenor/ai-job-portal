import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class SearchJobsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter by job title (case-insensitive, partial match)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Filter by company name (case-insensitive, partial match)' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Filter by industry (comma-separated for multiple, e.g., "IT,Finance")',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Filter by company type (e.g., startup, enterprise, public, private)',
  })
  @IsOptional()
  @IsString()
  companyType?: string;

  @ApiPropertyOptional({
    description: 'Filter by posting date',
    enum: ['all', '24h', '3d', '7d'],
  })
  @IsOptional()
  @IsIn(['all', '24h', '3d', '7d'])
  postedWithin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  employmentTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  workModes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  experienceLevels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  skillIds?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ enum: ['date', 'salary', 'relevance'] })
  @IsOptional()
  @IsEnum(['date', 'salary', 'relevance'])
  sortBy?: string;
}
