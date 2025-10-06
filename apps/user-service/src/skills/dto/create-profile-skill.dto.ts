import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileSkillDto {
  @ApiProperty()
  @IsString()
  skillName: string;

  @ApiPropertyOptional({ enum: ['technical', 'soft', 'language', 'industry_specific'] })
  @IsOptional()
  @IsEnum(['technical', 'soft', 'language', 'industry_specific'])
  category?: 'technical' | 'soft' | 'language' | 'industry_specific';

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @ApiPropertyOptional({ description: 'Years of experience with this skill' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;
}
