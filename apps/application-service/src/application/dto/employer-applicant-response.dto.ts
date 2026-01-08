import { ApiProperty } from '@nestjs/swagger';

export class EmployerApplicantResponseDto {
  @ApiProperty({
    description: 'Application ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  applicationId: string;

  @ApiProperty({
    description: 'Job ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  jobId: string;

  @ApiProperty({
    description: 'Job title',
    example: 'QA Tester',
  })
  jobTitle: string;

  @ApiProperty({
    description: 'Candidate ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  candidateId: string;

  @ApiProperty({
    description: 'Candidate full name',
    example: 'Riya Sharma',
  })
  candidateName: string;

  @ApiProperty({
    description: 'Candidate email',
    example: 'riya.sharma@analyticsmail.com',
  })
  candidateEmail: string;

  @ApiProperty({
    description: 'Resume URL',
    example: 'https://res.cloudinary.com/...',
    nullable: true,
  })
  resumeUrl: string | null;

  @ApiProperty({
    description: 'Application status',
    example: 'applied',
  })
  status: string;

  @ApiProperty({
    description: 'Application submission timestamp',
    example: '2026-01-07T10:38:38.065Z',
  })
  appliedAt: Date;

  @ApiProperty({
    description: 'Timestamp when employer viewed the application',
    example: '2026-01-07T11:00:00.000Z',
    nullable: true,
  })
  viewedAt: Date | null;

  @ApiProperty({
    description: 'Screening answers (Quick Apply only)',
    example: {
      'Why do you want this role?': 'I enjoy backend development',
      'Years of experience?': '3',
    },
    nullable: true,
  })
  screeningAnswers: Record<string, any> | null;
}
