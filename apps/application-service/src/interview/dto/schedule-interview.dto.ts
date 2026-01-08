import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsDateString, IsInt, IsOptional, IsNotEmpty } from 'class-validator';

export class ScheduleInterviewDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the job application',
  })
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    example: 'video',
    description: 'Type of interview: phone, video, or in_person',
  })
  @IsString()
  @IsNotEmpty()
  interviewType: string;

  @ApiProperty({
    example: '2026-01-15T10:00:00Z',
    description: 'Scheduled date and time for the interview',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Duration of the interview in minutes',
    default: 60,
  })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Location or video link for the interview',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
