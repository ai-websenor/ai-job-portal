import { IsOptional, IsString, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TemplateLevel } from './create-resume-template.dto';

export class ResumeTemplateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateType?: string;

  @ApiPropertyOptional({ enum: TemplateLevel })
  @IsOptional()
  @IsEnum(TemplateLevel)
  templateLevel?: TemplateLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPremium?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}
