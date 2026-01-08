import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobQuestionDto } from './job-question.dto';
import {
  JobType,
  WorkType,
  ExperienceLevel,
  PayRate,
} from '../enums/job.enums';

export class CreateJobDto {
  // ================= BASIC DETAILS =================

  @ApiProperty({
    example: 'Senior Backend Developer',
    description: 'Job title',
  })
  @IsNotEmpty({ message: 'title is required' })
  @IsString()
  title: string;

  @ApiProperty({
    example:
      'We are looking for a Node.js developer with microservices experience',
    description: 'Detailed job description',
  })
  @IsNotEmpty({ message: 'description is required' })
  @IsString()
  description: string;

  // ================= SKILLS =================

  @ApiProperty({
    example: ['Node.js', 'NestJS', 'PostgreSQL'],
    type: [String],
    description: 'Required skills for the job',
  })
  @IsNotEmpty({ message: 'skills are required' })
  @IsArray()
  @IsString({
    each: true,
    message: 'each skill must be a string',
  })
  skills: string[];

  // ================= SALARY =================

  @ApiPropertyOptional({
    example: 5000,
    description: 'Minimum salary',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'salaryMin must be at least 0' })
  salaryMin?: number;

  @ApiPropertyOptional({
    example: 22000,
    description: 'Maximum salary',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'salaryMax must be at least 0' })
  salaryMax?: number;

  @ApiPropertyOptional({
    enum: PayRate,
    example: PayRate.MONTHLY,
    description: 'Pay rate frequency',
    enumName: 'PayRate',
  })
  @IsOptional()
  @IsEnum(PayRate, {
    message: `payRate must be one of: ${Object.values(PayRate).join(', ')}`,
  })
  payRate?: PayRate;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to show salary information publicly',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showSalary?: boolean;

  // ================= LOCATION =================

  @ApiPropertyOptional({
    example: 'Karnataka',
    description: 'State/province',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'Bangalore',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'Hybrid',
    description: 'Work location type: Remote | Onsite | Hybrid',
  })
  @IsNotEmpty({ message: 'location is required' })
  @IsString()
  location: string;

  // ================= JOB META =================

  @ApiProperty({
    enum: ExperienceLevel,
    example: ExperienceLevel.MID,
    description: 'Experience level required for the job',
    enumName: 'ExperienceLevel',
  })
  @IsNotEmpty({ message: 'experienceLevel is required' })
  @IsEnum(ExperienceLevel, {
    message: `experienceLevel must be one of: ${Object.values(ExperienceLevel).join(', ')}`,
  })
  experienceLevel: ExperienceLevel;

  @ApiProperty({
    enum: JobType,
    example: JobType.FULL_TIME,
    description: 'Type of employment',
    enumName: 'JobType',
  })
  @IsNotEmpty({ message: 'jobType is required' })
  @IsEnum(JobType, {
    message: `jobType must be one of: ${Object.values(JobType).join(', ')}`,
  })
  jobType: JobType;

  @ApiProperty({
    enum: WorkType,
    example: WorkType.PERMANENT,
    description: 'Nature of employment contract',
    enumName: 'WorkType',
  })
  @IsNotEmpty({ message: 'workType is required' })
  @IsEnum(WorkType, {
    message: `workType must be one of: ${Object.values(WorkType).join(', ')}`,
  })
  workType: WorkType;

  // ================= APPLICATION DEADLINE =================

  @ApiPropertyOptional({
    example: '2026-01-06T07:44:21.875Z',
    description: 'Application deadline (ISO 8601 date string)',
  })
  @IsOptional()
  applicationDeadline?: Date;

  // ================= CUSTOM QUESTIONS =================

  @ApiPropertyOptional({
    type: [JobQuestionDto],
    description: 'Custom screening questions for job application',
    example: [
      {
        question: 'What is your preferred working style?',
        type: 'multiple_choice',
        options: ['Remote', 'Hybrid', 'Onsite'],
        isMandatory: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobQuestionDto)
  questions?: JobQuestionDto[];
}
