import { ApiProperty } from '@nestjs/swagger';

class CandidateInfoDto {
  @ApiProperty({ example: 'a486ab43-5fc3-4c80-8905-d66565fc4c68' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true })
  profilePhoto: string | null;

  @ApiProperty({ example: 'San Francisco, CA' })
  location: string;

  @ApiProperty({ example: 5, nullable: true })
  totalExperienceYears: number | null;

  @ApiProperty({ example: 30, description: 'Notice period in days', nullable: true })
  noticePeriodDays: number | null;

  @ApiProperty({ example: 'full_time', nullable: true })
  preferredJobType: string | null;

  @ApiProperty({
    example: { min: 100000, max: 150000, currency: 'USD' },
    nullable: true,
  })
  expectedSalary: {
    min: number | null;
    max: number | null;
    currency: string | null;
  } | null;

  @ApiProperty({ example: 'Senior Backend Engineer', nullable: true })
  jobRole: string | null;
}

class ResumeDto {
  @ApiProperty({ example: 'https://example.com/resume.pdf', nullable: true })
  url: string | null;

  @ApiProperty({ example: 'pdf', nullable: true })
  fileType: string | null;

  @ApiProperty({ example: 'John_Doe_Resume.pdf', nullable: true })
  resumeName: string | null;

  @ApiProperty({ example: 524288, description: 'File size in bytes', nullable: true })
  fileSize: number | null;
}

class WorkExperienceDto {
  @ApiProperty({ example: 'Tech Corp' })
  company: string;

  @ApiProperty({ example: 'Backend Engineer' })
  role: string;

  @ApiProperty({ example: '2020-01' })
  from: string;

  @ApiProperty({ example: 'Present' })
  to: string;
}

class EducationDto {
  @ApiProperty({ example: 'MIT' })
  institution: string;

  @ApiProperty({ example: 'BS Computer Science' })
  degree: string;

  @ApiProperty({ example: '2015' })
  from: string;

  @ApiProperty({ example: '2019' })
  to: string;
}

class AppliedJobDto {
  @ApiProperty({ example: 'e23b1331-fade-4361-9d72-38ee6bcb283a' })
  jobId: string;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  jobTitle: string;

  @ApiProperty({ example: '2026-01-14T10:00:00Z' })
  appliedAt: string;

  @ApiProperty({ example: 'shortlisted' })
  status: string;
}

export class EmployerCandidateResponseDto {
  @ApiProperty({ type: CandidateInfoDto })
  candidate: CandidateInfoDto;

  @ApiProperty({ type: ResumeDto, nullable: true })
  resume: ResumeDto | null;

  @ApiProperty({ type: [String], example: ['Node.js', 'TypeScript', 'PostgreSQL'] })
  skills: string[];

  @ApiProperty({ type: [WorkExperienceDto] })
  workExperience: WorkExperienceDto[];

  @ApiProperty({ type: [EducationDto] })
  education: EducationDto[];

  @ApiProperty({
    type: [AppliedJobDto],
    description: 'Jobs this candidate applied to (employer context)',
  })
  appliedJobs: AppliedJobDto[];
}
