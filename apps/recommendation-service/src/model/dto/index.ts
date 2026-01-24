import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, IsDateString } from 'class-validator';

export class CreateModelDto {
  @ApiProperty({ description: 'Model name (e.g., job-recommendation-engine)' })
  @IsString()
  modelName: string;

  @ApiProperty({ description: 'Model version (e.g., v1.0.0)' })
  @IsString()
  modelVersion: string;

  @ApiPropertyOptional({ description: 'Algorithm type' })
  @IsOptional()
  @IsString()
  algorithmType?: string;

  @ApiPropertyOptional({ description: 'Model parameters (JSON)' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Performance metrics (JSON)' })
  @IsOptional()
  @IsObject()
  performanceMetrics?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Training date (ISO)' })
  @IsOptional()
  @IsDateString()
  trainingDate?: string;
}

export class UpdateModelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  algorithmType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  performanceMetrics?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trainingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deploymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DeployModelDto {
  @ApiPropertyOptional({ description: 'Deployment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
