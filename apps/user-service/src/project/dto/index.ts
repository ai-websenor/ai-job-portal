import { IsString, IsOptional, IsArray, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NormalizeBulletText } from '../../common/transformers';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Project description. Accepts a string or an array of bullet lines.',
  })
  @IsOptional()
  @NormalizeBulletText()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project URL (GitHub, demo, etc.)' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Technologies used', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional({ description: 'Project highlights/achievements', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class ProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() profileId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() startDate?: string;
  @ApiPropertyOptional() endDate?: string;
  @ApiPropertyOptional() url?: string;
  @ApiPropertyOptional() technologies?: string[];
  @ApiPropertyOptional() highlights?: string[];
  @ApiPropertyOptional() displayOrder?: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
