import { IsString, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const toStringArray = ({ value }: { value: unknown }) => {
  if (!value) return undefined;
  const arr = typeof value === 'string' ? value.split(',') : (value as string[]);
  return arr.filter((v: string) => v && v.trim() !== '').map((v: string) => v.trim());
};

export class SearchCandidatesDto {
  @ApiPropertyOptional({
    description:
      'Search query - searches in candidate name, headline, skill name, and current/past job title. Case-insensitive, partial match.',
    example: 'React Developer',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description:
      'Filter by location (searches city, state, country). Case-insensitive, partial match.',
    example: 'Bangalore',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description:
      'Filter by experience level buckets (years of total experience). Comma-separated for multiple values.',
    enum: ['0-1', '1-2', '3-5', '5-10', '10+'],
    example: '3-5,5-10',
    type: [String],
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  experienceLevels?: string[];

  @ApiPropertyOptional({
    description: 'Minimum expected salary filter (in LPA, e.g. 6 for 6 LPA).',
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum expected salary filter (in LPA, e.g. 15 for 15 LPA).',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional({
    description:
      'Filter by employment type. Comma-separated for multiple values. Matches candidate job preferences.',
    enum: ['full_time', 'part_time', 'contract', 'internship'],
    example: 'full_time,contract',
    type: [String],
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  employmentTypes?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by availability / notice period. Comma-separated for multiple values. ' +
      '`immediate` = 0 days, `15d` = within 15 days, `30d` = within 30 days, `notice` = serving notice (> 30 days).',
    enum: ['immediate', '15d', '30d', 'notice'],
    example: 'immediate,15d',
    type: [String],
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  availability?: string[];

  @ApiPropertyOptional({
    description: 'Filter by skill IDs. Comma-separated for multiple values.',
    type: [String],
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  skillIds?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Sort order. `relevance` (default), `recent` (newest profiles), `experience` (most experienced first), `salary` (highest expected salary first).',
    enum: ['relevance', 'recent', 'experience', 'salary'],
  })
  @IsOptional()
  @IsEnum(['relevance', 'recent', 'experience', 'salary'])
  sortBy?: string;
}
