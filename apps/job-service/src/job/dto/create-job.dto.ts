import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayNotEmpty,
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
  WorkMode,
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

  @ApiPropertyOptional({
    enum: ExperienceLevel,
    example: ExperienceLevel.MID,
    description:
      'Experience level required for the job (LEGACY - optional, prefer experienceMin/Max)',
    enumName: 'ExperienceLevel',
  })
  @IsOptional()
  @IsEnum(ExperienceLevel, {
    message: `experienceLevel must be one of: ${Object.values(ExperienceLevel).join(', ')}`,
  })
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({
    enum: JobType,
    example: JobType.FULL_TIME,
    description:
      'Type of employment (LEGACY - optional, prefer employmentType)',
    enumName: 'JobType',
  })
  @IsOptional()
  @IsEnum(JobType, {
    message: `jobType must be one of: ${Object.values(JobType).join(', ')}`,
  })
  jobType?: JobType;

  @ApiPropertyOptional({
    enum: WorkType,
    example: WorkType.PERMANENT,
    description:
      'Nature of employment contract (LEGACY - optional, prefer engagementType)',
    enumName: 'WorkType',
  })
  @IsOptional()
  @IsEnum(WorkType, {
    message: `workType must be one of: ${Object.values(WorkType).join(', ')}`,
  })
  workType?: WorkType;

  // ================= APPLICATION DEADLINE =================

  @ApiPropertyOptional({
    example: '2026-01-06T07:44:21.875Z',
    description: 'Application deadline (ISO 8601 date string)',
  })
  @IsOptional()
  applicationDeadline?: Date;

  @ApiPropertyOptional({
    example: '2026-01-06T07:44:21.875Z',
    description:
      'Application deadline (ISO 8601 date string) - Alias for applicationDeadline',
  })
  @IsOptional()
  deadline?: Date;

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

  // ================= NEW ENHANCED FIELDS (BACKWARD COMPATIBLE) =================

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum years of experience required',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'experienceMin must be at least 0' })
  experienceMin?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Maximum years of experience required',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'experienceMax must be at least 0' })
  experienceMax?: number;

  @ApiPropertyOptional({
    enum: ['full_time', 'part_time'],
    example: 'full_time',
    description: 'Employment type (full-time or part-time)',
  })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({
    enum: ['permanent', 'contract', 'gig'],
    example: 'permanent',
    description: 'Engagement type (permanent, contract, or gig)',
  })
  @IsOptional()
  @IsString()
  engagementType?: string;

  @ApiPropertyOptional({
    enum: WorkMode,
    isArray: true,
    example: [WorkMode.HYBRID],
    description: 'Work mode (on_site, remote, or hybrid) - accepts array',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WorkMode, { each: true })
  workMode?: WorkMode[];

  // ================= ADDITIONAL FIELDS (BACKWARD COMPATIBLE) =================

  @ApiPropertyOptional({
    example: 'India',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: { category: ['Technology'], vertical: ['Software Development'] },
    description: 'Job section with category and vertical arrays (JSONB)',
  })
  @IsOptional()
  section?: object;

  @ApiPropertyOptional({
    example: 'authorized',
    description: 'Immigration status requirement',
  })
  @IsOptional()
  @IsString()
  immigrationStatus?: string;

  @ApiPropertyOptional({
    example: 'occasional',
    description: 'Travel requirements for the job',
  })
  @IsOptional()
  @IsString()
  travelRequirements?: string;

  @ApiPropertyOptional({
    example: 'Bachelor degree in Computer Science',
    description: 'Required qualification',
  })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({
    example: 'AWS Certified Solutions Architect',
    description: 'Required certification',
  })
  @IsOptional()
  @IsString()
  certification?: string;
}
