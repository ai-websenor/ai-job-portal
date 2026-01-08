import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

export class GetMyApplicationsDto {
  @ApiPropertyOptional({
    enum: ApplicationStatus,
    description: 'Filter applications by status',
    example: 'applied',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus, {
    message:
      'Invalid status value. Allowed values: applied, viewed, shortlisted, interview_scheduled, rejected, offered, hired, withdrawn',
  })
  status?: ApplicationStatus;
}
