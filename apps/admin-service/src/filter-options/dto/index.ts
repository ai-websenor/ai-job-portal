import { IsString, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_GROUPS = [
  'experience_level',
  'location_type',
  'pay_rate',
  'posted_within',
  'job_type',
  'industry',
  'department',
  'company_type',
  'sort_by',
];

export class CreateFilterOptionDto {
  @ApiProperty({
    description: 'Filter group name',
    enum: VALID_GROUPS,
    example: 'job_type',
  })
  @IsString()
  @IsIn(VALID_GROUPS)
  group: string;

  @ApiProperty({ description: 'Display label for the frontend', example: 'Full Time' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Value sent in API queries', example: 'full_time' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Whether this option is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order (lower = first)', default: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class UpdateFilterOptionDto {
  @ApiPropertyOptional({ description: 'Display label for the frontend' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Value sent in API queries' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: 'Whether this option is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order (lower = first)' })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
