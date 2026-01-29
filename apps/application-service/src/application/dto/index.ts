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

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: [
      'applied',
      'viewed',
      'shortlisted',
      'interview_scheduled',
      'rejected',
      'hired',
      'offer_accepted',
      'offer_rejected',
      'withdrawn',
    ],
  })
  @IsEnum([
    'applied',
    'viewed',
    'shortlisted',
    'interview_scheduled',
    'rejected',
    'hired',
    'offer_accepted',
    'offer_rejected',
    'withdrawn',
  ])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
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

export class EmployerApplicationsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by job title (case-insensitive, partial match)' })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: [
      'applied',
      'viewed',
      'shortlisted',
      'interview_scheduled',
      'rejected',
      'hired',
      'offer_accepted',
      'offer_rejected',
      'withdrawn',
    ],
  })
  @IsOptional()
  @IsEnum([
    'applied',
    'viewed',
    'shortlisted',
    'interview_scheduled',
    'rejected',
    'hired',
    'offer_accepted',
    'offer_rejected',
    'withdrawn',
  ])
  status?: string;

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
