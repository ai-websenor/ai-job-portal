import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiProperty() @IsUUID()
  jobId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  coverLetter?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  answers?: Record<string, string>;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: ['applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired', 'offer_accepted', 'offer_rejected', 'withdrawn'],
  })
  @IsEnum(['applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired', 'offer_accepted', 'offer_rejected', 'withdrawn'])
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  note?: string;
}
