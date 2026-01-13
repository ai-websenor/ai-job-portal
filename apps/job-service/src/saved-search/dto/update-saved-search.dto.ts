import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { AlertFrequency } from './create-saved-search.dto';

export class UpdateSavedSearchDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Enable or disable job alerts for this search',
  })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @ApiPropertyOptional({
    enum: AlertFrequency,
    example: AlertFrequency.DAILY,
    description: 'Update alert frequency',
    enumName: 'AlertFrequency',
  })
  @IsOptional()
  @IsEnum(AlertFrequency, {
    message: `alertFrequency must be one of: ${Object.values(AlertFrequency).join(', ')}`,
  })
  alertFrequency?: AlertFrequency;

  @ApiPropertyOptional({
    example: ['email', 'push'],
    description: 'Update alert channels',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each alert channel must be a string' })
  alertChannels?: string[];
}
