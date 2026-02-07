import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TemplateLevel {
  FRESHER = 'fresher',
  MID = 'mid',
  EXPERIENCED = 'experienced',
}

export class CreateResumeTemplateDto {
  @ApiProperty({ example: 'Modern Professional' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  templateType?: string;

  @ApiPropertyOptional({ enum: TemplateLevel })
  @IsOptional()
  @IsEnum(TemplateLevel)
  templateLevel?: TemplateLevel;

  @ApiProperty({ description: 'HTML with {{placeholders}}' })
  @IsString()
  templateHtml: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateCss?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}
