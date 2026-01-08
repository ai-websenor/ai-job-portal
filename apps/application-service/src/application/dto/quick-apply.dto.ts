import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class QuickApplyDto {
  @ApiPropertyOptional({
    example:
      'I am very interested in this position and believe my skills align well with the requirements.',
    description: 'Optional cover letter for the job application',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({
    example: { question1: 'answer1', question2: 'answer2' },
    description: 'Optional screening question answers as a JSON object',
  })
  @IsOptional()
  @IsObject()
  screeningAnswers?: Record<string, any>;
}
