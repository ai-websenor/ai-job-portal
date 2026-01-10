import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../common/enums/application.enums';

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
