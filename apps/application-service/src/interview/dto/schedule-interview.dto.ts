import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsEnum,
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
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Location or video link for the interview',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'online',
    description: 'Mode of the interview (online/offline)',
  })
  @IsOptional()
  @IsString()
  meetingType?: string;

  @ApiPropertyOptional({
    example: 'Zoom',
    description: 'Tool used for the meeting (Zoom, Teams, Meet)',
  })
  @IsOptional()
  @IsString()
  meetingTool?: string;

  @ApiPropertyOptional({
    example: 45,
    description: 'Duration in minutes',
  })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 'Technical round with backend lead',
    description: 'Additional notes for the interview',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
