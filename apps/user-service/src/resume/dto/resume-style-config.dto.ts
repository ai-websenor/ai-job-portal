import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * Dynamic styling configuration that can be passed with PDF generation
 * or template-data requests to customize the resume appearance.
 *
 * All fields are optional — server defaults (Inter font, 11pt, #1a1a1a, 15mm margins)
 * are used when not provided.
 */
export class ResumeStyleConfigDto {
  @ApiPropertyOptional({
    description: 'Font family (CSS value)',
    example: "'Inter', sans-serif",
  })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({
    description: 'Base font size (CSS value with unit)',
    example: '11pt',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?(pt|px|em|rem)$/, {
    message: 'Must be a valid CSS font size (e.g. 11pt, 14px)',
  })
  fontSize?: string;

  @ApiPropertyOptional({
    description: 'Line height (unitless or with unit)',
    example: '1.4',
  })
  @IsOptional()
  @IsString()
  lineHeight?: string;

  @ApiPropertyOptional({
    description: 'Primary text color (hex)',
    example: '#1a1a1a',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{3,8}$/, { message: 'Must be a valid hex color (e.g. #1a1a1a)' })
  color?: string;

  @ApiPropertyOptional({
    description: 'Accent color for headings, links, highlights (hex)',
    example: '#2563eb',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{3,8}$/, { message: 'Must be a valid hex color (e.g. #2563eb)' })
  accentColor?: string;

  @ApiPropertyOptional({
    description: 'Page margin (CSS value with unit)',
    example: '15mm',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?(mm|cm|px|in)$/, {
    message: 'Must be a valid CSS margin (e.g. 15mm, 0.5in)',
  })
  pageMargin?: string;
}
