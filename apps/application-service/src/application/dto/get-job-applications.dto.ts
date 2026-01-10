import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../common/enums/application.enums';

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
