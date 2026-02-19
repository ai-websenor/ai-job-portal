import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  INDUSTRY_SPECIFIC = 'industry_specific',
}

export class AddProfileSkillDto {
  @ApiProperty({
    description: 'Skill name (matched against master list or created as custom skill)',
  })
  @IsString()
  skillName: string;

  @ApiPropertyOptional({
    description: 'Category of the skill (used for custom skills, defaults to industry_specific)',
    enum: SkillCategory,
  })
  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @ApiPropertyOptional({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @ApiPropertyOptional({ description: 'Years of experience with this skill' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export class BulkAddProfileSkillDto {
  @ApiProperty({ type: [AddProfileSkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddProfileSkillDto)
  skills: AddProfileSkillDto[];
}

export class UpdateProfileSkillDto {
  @ApiPropertyOptional({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @ApiPropertyOptional({ description: 'Years of experience with this skill' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export enum SkillType {
  MASTER_TYPED = 'master-typed',
  USER_TYPED = 'user-typed',
}

export class SkillQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminSkillQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by type', enum: SkillType })
  @IsOptional()
  @IsEnum(SkillType)
  type?: SkillType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class UpdateMasterSkillDto {
  @ApiPropertyOptional({ description: 'Skill name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Skill type', enum: SkillType })
  @IsOptional()
  @IsEnum(SkillType)
  type?: SkillType;

  @ApiPropertyOptional({ description: 'Skill category', enum: SkillCategory })
  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;
}

export class ProfileSkillResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() profileId: string;
  @ApiProperty() skillId: string;
  @ApiProperty() proficiencyLevel: string;
  @ApiPropertyOptional() yearsOfExperience?: number;
  @ApiPropertyOptional() displayOrder?: number;
  @ApiPropertyOptional() skill?: {
    id: string;
    name: string;
    category: string;
  };
  @ApiProperty() createdAt: Date;
}
