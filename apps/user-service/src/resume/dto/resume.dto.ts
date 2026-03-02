import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PersonalDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headline?: string;
}

export class EducationDetailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class SkillsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  technicalSkills: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  softSkills: string[];
}

export class ExperienceDetailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  description?: string[];
}

export class JobPreferencesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  industryPreferences: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  preferredLocation: string[];
}

export class StructuredResumeDataDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  contentType: string;

  @ApiProperty({ type: PersonalDetailsDto })
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  personalDetails: PersonalDetailsDto;

  @ApiProperty({ type: [EducationDetailDto] })
  @ValidateNested({ each: true })
  @Type(() => EducationDetailDto)
  educationalDetails: EducationDetailDto[];

  @ApiProperty({ type: SkillsDto })
  @ValidateNested()
  @Type(() => SkillsDto)
  skills: SkillsDto;

  @ApiProperty({ type: [ExperienceDetailDto] })
  @ValidateNested({ each: true })
  @Type(() => ExperienceDetailDto)
  experienceDetails: ExperienceDetailDto[];

  @ApiProperty({ type: JobPreferencesDto })
  @ValidateNested()
  @Type(() => JobPreferencesDto)
  jobPreferences: JobPreferencesDto;
}

export class ResumeSectionDto {
  @ApiProperty({ enum: ['education', 'experience', 'skills', 'personal', 'unknown'] })
  @IsEnum(['education', 'experience', 'skills', 'personal', 'unknown'])
  type: 'education' | 'experience' | 'skills' | 'personal' | 'unknown';

  @ApiProperty()
  @IsNumber()
  startIndex: number;

  @ApiProperty()
  @IsNumber()
  endIndex: number;

  @ApiProperty()
  @IsString()
  content: string;
}
