import { ApiProperty } from '@nestjs/swagger';

export class MyJobsResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the job',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  jobId: string;

  @ApiProperty({
    description: 'Job title',
    example: 'UI/UX Designer',
  })
  title: string;

  @ApiProperty({
    description: 'Type of employment',
    example: 'Full-Time',
  })
  jobType: string;

  @ApiProperty({
    description: 'Number of applications received for this job',
    example: 798,
  })
  applicationsCount: number;

  @ApiProperty({
    description: 'Current status of the job',
    enum: ['Active', 'Inactive', 'Expired'],
    example: 'Active',
  })
  status: 'Active' | 'Inactive' | 'Expired';

  @ApiProperty({
    description: 'Number of days remaining until the deadline',
    example: 27,
  })
  daysRemaining: number;
}
