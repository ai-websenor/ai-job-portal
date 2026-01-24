import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AlertFrequency {
  INSTANT = 'instant',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Name for this saved search' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Search criteria as JSON string' })
  @IsString()
  searchCriteria: string;

  @ApiPropertyOptional({ description: 'Enable job alerts', default: true })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Alert frequency', enum: AlertFrequency, default: 'daily' })
  @IsOptional()
  @IsEnum(AlertFrequency)
  alertFrequency?: AlertFrequency;

  @ApiPropertyOptional({ description: 'Alert channels (comma-separated)', example: 'email,push' })
  @IsOptional()
  @IsString()
  alertChannels?: string;
}

export class UpdateSavedSearchDto extends PartialType(CreateSavedSearchDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SavedSearchQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by alert enabled' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  alertEnabled?: boolean;
}
