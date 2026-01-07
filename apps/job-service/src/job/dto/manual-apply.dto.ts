import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class ManualApplyDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the selected resume from the resumes table',
  })
  @IsUUID()
  @IsNotEmpty()
  resumeId: string;

  @ApiPropertyOptional({
    example:
      'I am very interested in this position and believe my skills align well with the requirements.',
    description: 'Optional cover letter for the job application',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiProperty({
    example: true,
    description: 'User must agree to consent to apply for the job',
  })
  @IsBoolean()
  @IsNotEmpty()
  agreeConsent: boolean;
}
