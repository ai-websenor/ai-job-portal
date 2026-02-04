import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum BrandingTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export class CreateCareerPageDto {
  @ApiPropertyOptional({ description: 'Hero banner URL' })
  @IsOptional()
  @IsString()
  heroBannerUrl?: string;

  @ApiPropertyOptional({ description: 'Tagline' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string;

  @ApiPropertyOptional({ description: 'About section' })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({ description: 'Mission statement' })
  @IsOptional()
  @IsString()
  mission?: string;

  @ApiPropertyOptional({ description: 'Culture description' })
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiPropertyOptional({ description: 'Benefits description' })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiPropertyOptional({ description: 'Custom colors (JSON)' })
  @IsOptional()
  @IsString()
  customColors?: string;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoDescription?: string;
}

export class UpdateCareerPageDto extends PartialType(CreateCareerPageDto) {
  @ApiPropertyOptional({ description: 'Is published' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
