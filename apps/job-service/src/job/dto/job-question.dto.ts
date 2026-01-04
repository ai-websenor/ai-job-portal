import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class JobQuestionDto {
  @ApiProperty({
    example: 'What is your preferred working style?',
  })
  @IsString()
  question: string;

  @ApiProperty({
    example: 'multiple_choice',
    description: 'text | multiple_choice',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    example: ['Remote', 'Hybrid', 'Onsite'],
    description: 'Only for multiple choice questions',
  })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiProperty({
    example: true,
    description: 'Mark question as mandatory',
  })
  @IsBoolean()
  isMandatory: boolean;
}
