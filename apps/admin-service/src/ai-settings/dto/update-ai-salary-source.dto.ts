import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAiSalarySourceDto {
  @ApiPropertyOptional({
    description:
      'Allow salary estimates to fall back to an external source when the ' +
      'platform has no comparable jobs. Platform data is always tried first.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Which external source to use. Must be one of the ids returned by ' +
      'GET /ai-settings, or an empty string to select none.',
    example: '',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provider?: string;
}
