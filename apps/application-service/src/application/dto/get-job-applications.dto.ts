import {IsOptional, IsEnum} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';

export enum ApplicationStatus {
  APPLIED = 'applied',
  VIEWED = 'viewed',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  REJECTED = 'rejected',
  OFFERED = 'offered',
  HIRED = 'hired',
  WITHDRAWN = 'withdrawn',
}

export class GetJobApplicationsDto {
  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: ApplicationStatus,
    example: 'applied',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus, {
    message:
      'Status must be one of: applied, viewed, shortlisted, interview_scheduled, rejected, offered, hired, withdrawn',
  })
  status?: ApplicationStatus;
}
