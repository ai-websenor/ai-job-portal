import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApplicationStatus } from '../../common/enums/application.enums';

export class UpdateStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.SHORTLISTED,
    description: 'New status for the application',
    enumName: 'ApplicationStatus',
  })
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(ApplicationStatus, {
    message: `status must be one of: ${Object.values(ApplicationStatus).join(', ')}`,
  })
  status: ApplicationStatus;

  @ApiPropertyOptional({
    example: 'Candidate has strong technical skills',
    description: 'Optional notes about the status change (max 500 characters)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes must not exceed 500 characters' })
  notes?: string;
}
