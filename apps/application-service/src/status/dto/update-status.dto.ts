import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApplicationStatus {
  APPLIED = 'applied',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  REJECTED = 'rejected',
  HIRED = 'hired',
}

export class UpdateStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.SHORTLISTED,
    description: 'New status for the application',
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({
    example: 'Candidate has strong technical skills',
    description: 'Optional notes about the status change',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
