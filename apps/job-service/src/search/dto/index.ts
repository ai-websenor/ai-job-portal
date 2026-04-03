import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class SearchJobsDto {
  @ApiPropertyOptional({
    description:
      'Search query - searches in job title, description, skills, industry (category), and department (sub-category). Case-insensitive. Supports wildcards: "A*" (starts with A), "*developer" (ends with developer)',
    example: 'Information Technology',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by company name (case-insensitive, partial match)',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description:
      'Filter by industry (maps to job Category). Comma-separated for multiple values. Use values from GET /search/filters → industry',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  industry?: string[];

  @ApiPropertyOptional({
    description: 'Filter by company type. Comma-separated for multiple values.',
    enum: ['startup', 'sme', 'mnc', 'government'],
    example: 'startup',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  companyType?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by department (maps to job Sub Category). Comma-separated for multiple values. Use values from GET /search/filters → department',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  department?: string[];

  @ApiPropertyOptional({
    description: 'Filter by posting date',
    enum: ['all', '24h', '3d', '7d', '30d'],
  })
  @IsOptional()
  @IsIn(['all', '24h', '3d', '7d', '30d'])
  postedWithin?: string;

  @ApiPropertyOptional({
    description: 'Filter by job category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by work mode. Comma-separated for multiple values. Use values from GET /search/filters → locationType',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  workModes?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by experience level. Comma-separated for multiple values. Use values from GET /search/filters → experienceLevel',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  experienceLevels?: string[];

  @ApiPropertyOptional({
    description:
      'Minimum salary filter in rupees (e.g. 600000 for 6 LPA). Cannot be combined with salaryRange.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional({
    description:
      'Maximum salary filter in rupees (e.g. 1000000 for 10 LPA). Cannot be combined with salaryRange.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional({
    description:
      'Filter by predefined salary range (in LPA). Comma-separated for multiple ranges. Each range in "min_max" format (e.g. "6_10"). Use values from GET /search/filters → salaryRange. Cannot be combined with salaryMin/salaryMax.',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  salaryRange?: string[];

  @ApiPropertyOptional({
    description: 'Filter by location string (searches city, state, country)',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description:
      'Filter by job type. Comma-separated for multiple values. Use values from GET /search/filters → jobType',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  jobType?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by location type. Comma-separated for multiple values. Use values from GET /search/filters → locationType',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  locationType?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by pay rate. Comma-separated for multiple values. Use values from GET /search/filters → payRate',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = typeof value === 'string' ? value.split(',') : value;
    return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
  })
  @IsArray()
  payRate?: string[];

  @ApiPropertyOptional({
    description: 'Filter by skill IDs. Comma-separated for multiple values',
    type: [String],
  })
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

  @ApiPropertyOptional({
    description: 'Sort order. Use values from GET /search/filters → sortBy',
    enum: ['date', 'salary', 'salary_asc', 'salary_desc', 'relevance'],
  })
  @IsOptional()
  @IsEnum(['date', 'salary', 'salary_asc', 'salary_desc', 'relevance'])
  sortBy?: string;
}
