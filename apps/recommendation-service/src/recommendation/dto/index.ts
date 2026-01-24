import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendationQueryDto {
  @ApiPropertyOptional({ description: 'Number of recommendations', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Minimum score threshold (0-100)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;
}

export class RefreshRecommendationsDto {
  @ApiPropertyOptional({ description: 'Force refresh even if cache is valid' })
  @IsOptional()
  forceRefresh?: boolean;
}

export class RecommendationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() jobId: string;
  @ApiProperty() score: number;
  @ApiProperty() reason: string;
  @ApiPropertyOptional() job?: any; // Job details when included
}
