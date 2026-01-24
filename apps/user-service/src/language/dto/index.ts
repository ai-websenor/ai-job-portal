import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class AddProfileLanguageDto {
  @ApiProperty({ description: 'Language ID from master languages list' })
  @IsUUID()
  languageId: string;

  @ApiProperty({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsEnum(ProficiencyLevel)
  proficiency: ProficiencyLevel;

  @ApiPropertyOptional({ description: 'Is native language' })
  @IsOptional()
  @IsBoolean()
  isNative?: boolean;

  @ApiPropertyOptional({ description: 'Can read' })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional({ description: 'Can write' })
  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;

  @ApiPropertyOptional({ description: 'Can speak' })
  @IsOptional()
  @IsBoolean()
  canSpeak?: boolean;
}

export class UpdateProfileLanguageDto {
  @ApiPropertyOptional({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiency?: ProficiencyLevel;

  @ApiPropertyOptional({ description: 'Is native language' })
  @IsOptional()
  @IsBoolean()
  isNative?: boolean;

  @ApiPropertyOptional({ description: 'Can read' })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional({ description: 'Can write' })
  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;

  @ApiPropertyOptional({ description: 'Can speak' })
  @IsOptional()
  @IsBoolean()
  canSpeak?: boolean;
}

export class LanguageQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}
