import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum JobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  HOLD = 'hold',
}

export class UpdateJobStatusDto {
  @ApiProperty({
    description: 'The new status of the job',
    enum: JobStatus,
    example: 'active',
  })
  @IsNotEmpty()
  @IsEnum(JobStatus, {
    message: 'Status must be one of: active, inactive, hold',
  })
  status: JobStatus;
}
