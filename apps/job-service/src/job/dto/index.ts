import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsArray,
  MaxLength,
  IsObject,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// Constant for "Other" option value
export const OTHER_CATEGORY_VALUE = 'other';

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (must have parentId = null). Use "other" for custom category.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @ValidateIf((o) => o.categoryId !== OTHER_CATEGORY_VALUE)
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Subcategory ID (must belong to selected categoryId). Use "other" for custom subcategory.',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsOptional()
  @ValidateIf((o) => o.subCategoryId !== OTHER_CATEGORY_VALUE)
  @IsUUID()
  subCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Custom category name when "Other" is selected for category',
    example: 'Emerging Technologies',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customCategory?: string;

  @ApiPropertyOptional({
    description: 'Custom subcategory name when "Other" is selected for subcategory',
    example: 'Quantum Computing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customSubCategory?: string;

  @ApiProperty({
    type: [String],
    description:
      'Array of job types. Possible values: full_time, part_time, contract, internship, freelance',
    example: ['full_time', 'part_time', 'contract', 'internship', 'freelance'],
  })
  @IsArray()
  @IsString({ each: true })
  jobType: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of work modes. Possible values: on_site, remote, hybrid',
    example: ['on_site', 'remote', 'hybrid'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workMode?: string[];

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

  @ApiPropertyOptional({
    description: 'Application deadline for the job posting',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Immigration status requirements for the job',
    example: 'US Citizen, Green Card, H1B',
  })
  @IsOptional()
  @IsString()
  immigrationStatus?: string;

  @ApiPropertyOptional({
    description: 'Pay rate for the job (e.g., hourly, daily, weekly)',
    example: 'hourly',
  })
  @IsOptional()
  @IsString()
  payRate?: string;

  @ApiPropertyOptional({
    description: 'Travel requirements for the job',
    example: 'Up to 25% travel required',
  })
  @IsOptional()
  @IsString()
  travelRequirements?: string;

  @ApiPropertyOptional({
    description: 'Required qualification for the job',
    example: "Bachelor's degree in Computer Science or related field",
  })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({
    description: 'Required certifications for the job',
    example: 'AWS Certified Solutions Architect, PMP',
  })
  @IsOptional()
  @IsString()
  certification?: string;
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
