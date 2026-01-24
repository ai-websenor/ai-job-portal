import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum QuestionType {
  TEXT = 'text',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  YES_NO = 'yes_no',
  NUMERIC = 'numeric',
}

export class CreateScreeningQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Question type', enum: QuestionType })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiPropertyOptional({ description: 'Options for choice questions', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Is this question required', default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  order?: number;
}

export class UpdateScreeningQuestionDto extends PartialType(CreateScreeningQuestionDto) {}

export class ReorderQuestionsDto {
  @ApiProperty({ description: 'Ordered list of question IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];
}
