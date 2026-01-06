import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileSkillDto {
  @ApiProperty({
    example: 'JavaScript',
    description: 'Name of the skill (e.g., JavaScript, Python, Communication)',
  })
  @IsString()
  skillName: string;

  @ApiPropertyOptional({
    example: 'technical',
    enum: ['technical', 'soft', 'language', 'industry_specific'],
    description: 'Category of the skill. Options: technical, soft, language, industry_specific',
  })
  @IsOptional()
  @IsEnum(['technical', 'soft', 'language', 'industry_specific'])
  category?: 'technical' | 'soft' | 'language' | 'industry_specific';

  @ApiPropertyOptional({
    example: 'advanced',
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    description: 'Proficiency level. Options: beginner, intermediate, advanced, expert',
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @ApiPropertyOptional({
    example: 4,
    description: 'Years of experience with this skill (0-50)',
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;
}
