import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferenceDto {
  @ApiPropertyOptional({ description: 'Enable or disable email notifications', example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable or disable message notifications', example: true })
  @IsOptional()
  @IsBoolean()
  messages?: boolean;
}
