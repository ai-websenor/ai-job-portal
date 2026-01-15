import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
  ArrayMinSize,
} from 'class-validator';
import { QuestionType } from '../enums/question.enums';

export class JobQuestionDto {
  @ApiProperty({
    example: 'What is your preferred working style?',
    description: 'The question text to ask the candidate',
  })
  @IsString()
  question: string;

  @ApiProperty({
    enum: QuestionType,
    example: QuestionType.MULTIPLE_CHOICE,
    description:
      'Type of question - determines how the answer should be collected',
    enumName: 'QuestionType',
  })
  @IsEnum(QuestionType, {
    message: `type must be one of: ${Object.values(QuestionType).join(', ')}`,
  })
  type: QuestionType;

  @ApiPropertyOptional({
    type: [String],
    example: ['Remote', 'Hybrid', 'Onsite'],
    description:
      'Array of options for single_choice or multiple_choice questions. Required for choice-based questions.',
  })
  @ValidateIf((o: JobQuestionDto) =>
    [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE].includes(o.type),
  )
  @IsArray({ message: 'options must be an array for choice-based questions' })
  @ArrayMinSize(2, { message: 'options must contain at least 2 choices' })
  @IsString({ each: true, message: 'each option must be a string' })
  @IsOptional()
  options?: string[];

  @ApiProperty({
    example: true,
    description:
      'Whether the candidate must answer this question to submit the application',
  })
  @IsBoolean()
  isMandatory: boolean;
}
