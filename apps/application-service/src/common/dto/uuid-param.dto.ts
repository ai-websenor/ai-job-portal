import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO for validating jobId route parameter
 */
export class JobIdParamDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the job',
  })
  @IsUUID('4', { message: 'jobId must be a valid UUID' })
  @IsNotEmpty()
  jobId: string;
}

/**
 * DTO for validating applicationId route parameter
 */
export class ApplicationIdParamDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the application',
  })
  @IsUUID('4', { message: 'applicationId must be a valid UUID' })
  @IsNotEmpty()
  applicationId: string;
}

/**
 * DTO for validating interview id route parameter
 */
export class InterviewIdParamDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the interview',
  })
  @IsUUID('4', { message: 'id must be a valid UUID' })
  @IsNotEmpty()
  id: string;
}
