import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsString,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export const CANDIDATE_JOB_GROUP_IDS = [
  'wfh',
  'remote',
  'entry_level',
  'experienced',
  'high_paid',
  'most_applied',
] as const;

export type CandidateJobGroupId = (typeof CANDIDATE_JOB_GROUP_IDS)[number];

export class RecommendationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of recommendations (1-50)',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  // Search Filters (shared with SearchJobsDto)
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Work modes', type: [String] })
  @IsOptional()
  @IsArray()
  workModes?: string[];

  @ApiPropertyOptional({ description: 'Experience levels', type: [String] })
  @IsOptional()
  @IsArray()
  experienceLevels?: string[];

  @ApiPropertyOptional({ description: 'Min salary' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Max salary' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Location string' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class RefreshRecommendationsDto {
  @ApiPropertyOptional({ description: 'Force refresh even if cache is valid', example: true })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class RecommendationResponseDto {
  @ApiProperty({ example: 'job-uuid-here' }) jobId: string;
  @ApiProperty({ example: 92, description: 'AI relevance score (0-100)' })
  recommendationScore: number;
  @ApiProperty({
    example: 'Strong match — JavaScript, React skills align perfectly with Senior Full Stack role',
  })
  recommendationReason: string;
  @ApiPropertyOptional() job?: any;
}

export class CandidateJobGroupParamDto {
  @ApiProperty({
    description: 'Candidate job group ID',
    enum: CANDIDATE_JOB_GROUP_IDS,
    example: 'remote',
  })
  @IsString()
  @IsIn(CANDIDATE_JOB_GROUP_IDS)
  groupId: CandidateJobGroupId;
}

export class CandidateJobGroupJobsQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Jobs per page. Capped at 10 so every group returns the best small set.',
    default: 10,
    maximum: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number;
}
