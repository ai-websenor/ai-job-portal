import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { InterviewType } from '../../common/enums/application.enums';

export class ScheduleInterviewDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the job application',
  })
  @IsUUID('4', { message: 'applicationId must be a valid UUID' })
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    enum: InterviewType,
    example: InterviewType.VIDEO,
    description: 'Type of interview',
    enumName: 'InterviewType',
  })
  @IsNotEmpty({ message: 'interviewType is required' })
  @IsEnum(InterviewType, {
    message: `interviewType must be one of: ${Object.values(InterviewType).join(', ')}`,
  })
  interviewType: InterviewType;

  @ApiProperty({
    example: '2026-01-15T10:00:00Z',
    description: 'Scheduled date and time for the interview',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Duration of the interview in minutes (1-480)',
    default: 60,
    minimum: 1,
    maximum: 480,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'duration must be at least 1 minute' })
  @Max(480, { message: 'duration must not exceed 480 minutes (8 hours)' })
  duration?: number;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Location or video link for the interview',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
