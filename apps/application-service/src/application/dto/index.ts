import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiProperty() @IsUUID()
  jobId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  coverLetter?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject()
  answers?: Record<string, string>;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: ['pending', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'],
  })
  @IsEnum(['pending', 'screening', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'])
  status: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  note?: string;
}
