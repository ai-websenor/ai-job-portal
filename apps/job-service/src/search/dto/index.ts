import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class SearchJobsDto {
  @ApiPropertyOptional({
    description:
      'Search query - searches in job title, description, and skills. Case-insensitive. Supports wildcards: "A*" (starts with A), "*developer" (ends with developer)',
    example: 'React Developer',
  })
  @IsOptional()
  @IsString()
  query?: string;

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
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '');
  })
  @IsArray()
  workModes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '');
  })
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

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by job type (comma-separated, e.g., "full_time,part_time,contract")',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '');
  })
  @IsArray()
  jobType?: string[];

  @ApiPropertyOptional({
    description: 'Filter by location type (e.g., "onsite", "remote", "hybrid")',
  })
  @IsOptional()
  @IsString()
  locationType?: string;

  @ApiPropertyOptional({ description: 'Filter by pay rate (e.g., "monthly", "hourly", "yearly")' })
  @IsOptional()
  @IsString()
  payRate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '');
  })
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
