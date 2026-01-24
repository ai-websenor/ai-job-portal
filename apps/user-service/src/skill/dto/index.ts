import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class AddProfileSkillDto {
  @ApiProperty({ description: 'Skill name from master skills list' })
  @IsString()
  skillName: string;

  @ApiProperty({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsEnum(ProficiencyLevel)
  proficiencyLevel: ProficiencyLevel;

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
