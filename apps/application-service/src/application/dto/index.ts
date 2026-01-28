import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
