import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  jobType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of work modes: remote, onsite, hybrid',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workMode?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSalary?: boolean;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  benefits?: string;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {}

export class QuickApplyDto {
  @ApiPropertyOptional({ description: 'Optional cover letter for the application' })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({
    description: 'Answers to screening questions',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  screeningAnswers?: Record<string, string>;
}
