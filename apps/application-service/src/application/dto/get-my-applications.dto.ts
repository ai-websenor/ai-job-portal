import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page (max 50)',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
