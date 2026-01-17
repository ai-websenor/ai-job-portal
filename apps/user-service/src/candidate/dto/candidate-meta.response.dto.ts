import { ApiProperty } from '@nestjs/swagger';

export class PersonalInfoDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  mobile: string;

  @ApiProperty({ required: false, nullable: true })
  city: string | null;

  @ApiProperty({ required: false, nullable: true })
  state: string | null;

  @ApiProperty({ required: false, nullable: true })
  country: string | null;
}

export class SkillsDto {
  @ApiProperty({ type: [String] })
  technical: string[];

  @ApiProperty({ type: [String] })
  soft: string[];
}

export class EducationDto {
  @ApiProperty({ required: false, nullable: true })
  level: string | null;

  @ApiProperty()
  institution: string;

  @ApiProperty()
  degree: string;

  @ApiProperty({ required: false, nullable: true })
  fieldOfStudy: string | null;

  @ApiProperty({ required: false, nullable: true })
  startDate: string | null;

  @ApiProperty({ required: false, nullable: true })
  endDate: string | null;

  @ApiProperty({ required: false, nullable: true })
  grade: string | null;

  @ApiProperty()
  currentlyStudying: boolean;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;
}

export class WorkExperienceDto {
  @ApiProperty()
  companyName: string;

  @ApiProperty()
  jobTitle: string;

  @ApiProperty({ required: false, nullable: true })
  employmentType: string | null;

  @ApiProperty({ required: false, nullable: true })
  location: string | null;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ required: false, nullable: true })
  endDate: string | null;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ required: false, nullable: true })
  achievements: string | null;

  @ApiProperty({ required: false, nullable: true, type: [String] })
  skillsUsed: string[] | null;

  @ApiProperty({ required: false, nullable: true })
  duration: string | null;

  @ApiProperty()
  designation: string;
}

export class JobPreferencesDto {
  @ApiProperty({ type: [String] })
  jobTypes: string[];

  @ApiProperty({ type: [String] })
  preferredLocations: string[];

  @ApiProperty()
  willingToRelocate: boolean;

  @ApiProperty({ required: false, nullable: true })
  expectedSalaryMin: number | null;

  @ApiProperty({ required: false, nullable: true })
  expectedSalaryMax: number | null;

  @ApiProperty({ required: false, nullable: true })
  expectedSalary: number | null;

  @ApiProperty()
  salaryCurrency: string;

  @ApiProperty({ required: false, nullable: true, type: [String] })
  preferredIndustries: string[] | null;

  @ApiProperty({ required: false, nullable: true })
  workShift: string | null;

  @ApiProperty({ required: false, nullable: true })
  jobSearchStatus: string | null;

  @ApiProperty()
  noticePeriodDays: number;
}

export class CandidateMetaResponseDto {
  @ApiProperty()
  personalInfo: PersonalInfoDto;

  @ApiProperty()
  skills: SkillsDto;

  @ApiProperty({ type: [EducationDto] })
  education: EducationDto[];

  @ApiProperty({ type: [WorkExperienceDto] })
  workExperience: WorkExperienceDto[];

  @ApiProperty()
  jobPreferences: JobPreferencesDto;
}
