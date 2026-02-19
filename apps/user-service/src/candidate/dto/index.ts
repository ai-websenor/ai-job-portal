import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsNumber,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT_MESSAGE = 'must be in YYYY-MM-DD format (e.g., 2024-01-15)';

export class CreateCandidateProfileDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationCountry?: string;
}

export class UpdateCandidateProfileDto extends PartialType(CreateCandidateProfileDto) {
  // Note: isOpenToWork, expectedSalaryMin, expectedSalaryMax, and noticePeriodDays
  // belong to the jobPreferences table and should be updated via job preferences endpoint
}

export class AddExperienceDto {
  @ApiProperty()
  @IsString()
  companyName: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  designation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFresher?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: '2024-01-15', description: 'Start date in YYYY-MM-DD format' })
  @IsNotEmpty({ message: 'startDate is required' })
  @Matches(DATE_FORMAT_REGEX, { message: `startDate ${DATE_FORMAT_MESSAGE}` })
  startDate: string;

  @ApiPropertyOptional({
    example: '2025-06-30',
    description: 'End date in YYYY-MM-DD format. Required if isCurrent is false',
  })
  @IsOptional()
  @Matches(DATE_FORMAT_REGEX, { message: `endDate ${DATE_FORMAT_MESSAGE}` })
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  achievements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillsUsed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export class UpdateExperienceDto extends PartialType(AddExperienceDto) {}

export class AddEducationDto {
  @ApiPropertyOptional({
    enum: ['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'],
    description: 'Education level',
  })
  @IsOptional()
  @IsEnum(['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'], {
    message: 'level must be one of: high_school, bachelors, masters, phd, diploma, certificate',
  })
  level?: string;

  @ApiProperty()
  @IsString()
  institution: string;

  @ApiProperty()
  @IsString()
  degree: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiProperty({ example: '2020-09-01', description: 'Start date in YYYY-MM-DD format' })
  @IsNotEmpty({ message: 'startDate is required' })
  @Matches(DATE_FORMAT_REGEX, { message: `startDate ${DATE_FORMAT_MESSAGE}` })
  startDate: string;

  @ApiPropertyOptional({
    example: '2024-05-31',
    description: 'End date in YYYY-MM-DD format. Required if currentlyStudying is false',
  })
  @IsOptional()
  @Matches(DATE_FORMAT_REGEX, { message: `endDate ${DATE_FORMAT_MESSAGE}` })
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  honors?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relevantCoursework?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  currentlyStudying?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export class UpdateEducationDto extends PartialType(AddEducationDto) {}

export class ProfileViewQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class SelectAvatarDto {
  @ApiProperty({ description: 'Avatar ID to select' })
  @IsString()
  @IsNotEmpty()
  avatarId: string;
}
