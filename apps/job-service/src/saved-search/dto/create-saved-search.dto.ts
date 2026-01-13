import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export enum AlertFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateSavedSearchDto {
  @ApiPropertyOptional({
    example: 'Remote Backend Jobs',
    description: 'Optional name for this saved search',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: {
      keyword: 'backend',
      jobTypes: ['full_time'],
      locations: ['remote'],
      experienceLevel: 'mid',
    },
    description:
      'Search criteria matching Elasticsearch search API parameters. Must not be empty.',
  })
  @IsNotEmpty({ message: 'searchCriteria is required' })
  @IsObject({ message: 'searchCriteria must be an object' })
  searchCriteria: Record<string, any>;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable job alerts for this search',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional({
    enum: AlertFrequency,
    example: AlertFrequency.WEEKLY,
    description: 'How often to send job alerts',
    default: AlertFrequency.WEEKLY,
    enumName: 'AlertFrequency',
  })
  @IsOptional()
  @IsEnum(AlertFrequency, {
    message: `alertFrequency must be one of: ${Object.values(AlertFrequency).join(', ')}`,
  })
  alertFrequency?: AlertFrequency;

  @ApiPropertyOptional({
    example: ['email'],
    description: 'Channels to send alerts through',
    type: [String],
    default: ['email'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each alert channel must be a string' })
  alertChannels?: string[];
}
