import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class DateRangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter results by company ID' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class ReportPeriodDto extends DateRangeDto {
  @ApiPropertyOptional({ enum: ['day', 'week', 'month', 'year'] })
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

export class DateRangeWithLimitDto extends DateRangeDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
