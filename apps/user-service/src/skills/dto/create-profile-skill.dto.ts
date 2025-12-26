import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileSkillDto {
  @ApiProperty({
    example: 'JavaScript',
    description: 'Name of the skill',
  })
  @IsString()
  skillName: string;
  @ApiPropertyOptional({
    example: 'technical',
    enum: ['technical', 'soft', 'language', 'industry_specific'],
    description: 'Category of the skill',
  })
  @IsOptional()
  @IsEnum(['technical', 'soft', 'language', 'industry_specific'])
  category?: 'technical' | 'soft' | 'language' | 'industry_specific';
  @ApiPropertyOptional({
    example: 'advanced',
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    description: 'Proficiency level of the skill',
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  @ApiPropertyOptional({
    example: 4,
    description: 'Years of experience with this skill',
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;
}

