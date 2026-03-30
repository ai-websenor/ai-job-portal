import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsBoolean, Min, Max, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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
