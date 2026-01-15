import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString } from 'class-validator';

export class UpdateThemePreferencesDto {
  @ApiPropertyOptional({
    description: 'Primary theme color (Hex)',
    example: '#7c6cff',
  })
  @IsOptional()
  @IsString()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Background theme color (Hex)',
    example: '#ffffff',
  })
  @IsOptional()
  @IsString()
  @IsHexColor()
  backgroundColor?: string;

  @ApiPropertyOptional({
    description: 'Font theme color (Hex)',
    example: '#000000',
  })
  @IsOptional()
  @IsString()
  @IsHexColor()
  fontColor?: string;
}
