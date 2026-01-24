import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class ScheduleInterviewDto {
  @ApiProperty() @IsUUID()
  applicationId: string;

  @ApiProperty({ enum: ['phone', 'video', 'in_person', 'technical', 'hr', 'final'] })
  @IsEnum(['phone', 'video', 'in_person', 'technical', 'hr', 'final'])
  type: string;

  @ApiProperty() @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ default: 60 }) @IsOptional() @IsNumber()
  duration?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true })
  interviewerIds?: string[];
}

export class UpdateInterviewDto extends PartialType(ScheduleInterviewDto) {
  @ApiPropertyOptional({ enum: ['scheduled', 'confirmed', 'rescheduled'] })
  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'rescheduled'])
  status?: string;
}
