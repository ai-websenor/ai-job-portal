import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsBoolean,
  Equals,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApplicationStatus, APPLICATION_STATUS_VALUES } from '@ai-job-portal/common';

export class QuickApplyDto {
  @ApiProperty({ description: 'Job ID to apply for' })
  @IsUUID()
  jobId: string;

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

export class ApplyJobDto {
  @ApiProperty()
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  answers?: Record<string, string>;

  @ApiProperty()
  @IsBoolean()
  @Equals(true, { message: 'You must agree to the consent before applying for this job' })
  agreeConsent: boolean;
}

/**
 * Application Status Transitions by Role:
 *
 * EMPLOYER can set:
 * - 'viewed' (from: applied)
 * - 'shortlisted' (from: viewed)
 * - 'interview_scheduled' (from: shortlisted)
 * - 'hired' (from: interview_scheduled)
 * - 'rejected' (from: applied, viewed, shortlisted, interview_scheduled)
 *
 * CANDIDATE can set:
 * - 'withdrawn' (from: applied)
 * - 'applied' (from: withdrawn - to re-apply)
 * - 'offer_accepted' (from: hired)
 * - 'offer_rejected' (from: hired)
 */
export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: `New application status. Valid values depend on user role:

**Employer statuses:** viewed, shortlisted, interview_scheduled, hired, rejected

**Candidate statuses:** withdrawn, applied (re-apply), offer_accepted, offer_rejected`,
    enum: ApplicationStatus,
    example: ApplicationStatus.SHORTLISTED,
    enumName: 'ApplicationStatus',
  })
  @IsEnum(APPLICATION_STATUS_VALUES)
  status: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Optional note for the status change (employer only)' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CandidateApplicationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: ApplicationStatus,
    example: ApplicationStatus.APPLIED,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsEnum(APPLICATION_STATUS_VALUES)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class EmployerJobsSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by job title (case-insensitive, partial match)' })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class EmployerJobApplicantsQueryDto {
  @ApiProperty({ description: 'Job ID to get applicants for' })
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional({
    description: 'Search by candidate name (case-insensitive, partial match)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class EmployerApplicationsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by job title (case-insensitive, partial match)' })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: ApplicationStatus,
    example: ApplicationStatus.APPLIED,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsEnum(APPLICATION_STATUS_VALUES)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
