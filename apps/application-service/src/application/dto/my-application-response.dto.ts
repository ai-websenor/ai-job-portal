import { ApiProperty } from '@nestjs/swagger';

export class MyApplicationResponseDto {
  @ApiProperty({
    description: 'Application ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Job ID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  jobId: string;

  @ApiProperty({
    description: 'Job title',
    example: 'QA Tester',
  })
  jobTitle: string;

  @ApiProperty({
    description: 'Employer ID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  employerId: string;

  @ApiProperty({
    description: 'Job location (city, state)',
    example: 'Bangalore, Karnataka',
  })
  location: string;

  @ApiProperty({
    description: 'Job type',
    example: 'full_time',
  })
  jobType: string;

  @ApiProperty({
    description: 'Application status',
    example: 'applied',
  })
  status: string;

  @ApiProperty({
    description: 'Application submission timestamp',
    example: '2026-01-07T10:38:38.065Z',
  })
  appliedAt: string;

  @ApiProperty({
    description: 'Application viewed timestamp (nullable)',
    example: null,
    nullable: true,
  })
  viewedAt: string | null;

  @ApiProperty({
    description: 'Timeline of status changes',
    example: [
      { status: 'applied', by: 'candidate', at: '2026-01-14T10:00:00Z' },
      { status: 'viewed', by: 'employer', at: '2026-01-14T11:00:00Z' },
    ],
    required: false,
  })
  statusHistory?: Array<{
    status: string;
    by: 'candidate' | 'employer';
    at: string;
  }>;
}
