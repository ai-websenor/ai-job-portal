import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  IsNumber,
  Matches,
  IsNotEmpty,
  IsUrl,
  ValidateIf,
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
  @MaxLength(255)
  email?: string;

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

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;
}

export class UpdateCandidateProfileDto extends PartialType(CreateCandidateProfileDto) {
  // Note: isOpenToWork, expectedSalaryMin, expectedSalaryMax, and noticePeriodDays
  // belong to the jobPreferences table and should be updated via job preferences endpoint

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid mobile number format' })
  mobile?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other', 'not_specified'] })
  @IsOptional()
  @IsString()
  gender?: string;
}

export class AddExperienceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({
    description:
      'Set to true for freshers. When true, all other fields become optional and a minimal record is created.',
  })
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

  @ApiPropertyOptional({ example: '2024-01-15', description: 'Start date in YYYY-MM-DD format' })
  @ValidateIf((o) => o.startDate !== '' && o.startDate !== null && o.startDate !== undefined)
  @Matches(DATE_FORMAT_REGEX, { message: `startDate ${DATE_FORMAT_MESSAGE}` })
  startDate?: string | null;

  @ApiPropertyOptional({
    example: '2025-06-30',
    description: 'End date in YYYY-MM-DD format',
  })
  @ValidateIf((o) => o.endDate !== '' && o.endDate !== null && o.endDate !== undefined)
  @Matches(DATE_FORMAT_REGEX, { message: `endDate ${DATE_FORMAT_MESSAGE}` })
  endDate?: string | null;

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
  @ValidateIf((o) => o.level !== '')
  @IsEnum(['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'], {
    message: 'level must be one of: high_school, bachelors, masters, phd, diploma, certificate',
  })
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: '2020-09-01', description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @Matches(DATE_FORMAT_REGEX, { message: `startDate ${DATE_FORMAT_MESSAGE}` })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-05-31',
    description: 'End date in YYYY-MM-DD format',
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

  @ApiPropertyOptional({ description: 'Skip overlap validation and save anyway' })
  @IsOptional()
  @IsBoolean()
  forceSave?: boolean;
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

export class AvatarListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by gender', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Search by avatar name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class VerifyUrlDto {
  @ApiProperty({ example: 'https://linkedin.com/in/johndoe' })
  @IsString()
  @IsUrl({}, { message: 'Must be a valid URL' })
  url: string;
}

export class UpdateVisibilityDto {
  @ApiProperty({ enum: ['public', 'private'], description: 'Profile visibility setting' })
  @IsEnum(['public', 'private'], { message: 'visibility must be either public or private' })
  visibility: 'public' | 'private';
}

export class ProfilePhotoUploadUrlDto {
  @ApiProperty({ example: 'my-photo.jpg', description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/png', 'image/webp'],
    description: 'MIME type of the photo',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class ProfilePhotoConfirmDto {
  @ApiProperty({
    example: 'profile-photos/1708500000-abc123.jpg',
    description: 'S3 object key returned from the upload-url endpoint',
  })
  @IsString()
  @IsNotEmpty()
  key: string;
}

export class VerifyEducationOverlapDto {
  @ApiPropertyOptional({ example: '2020-09-01', description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @Matches(DATE_FORMAT_REGEX, { message: `startDate ${DATE_FORMAT_MESSAGE}` })
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-05-31', description: 'End date in YYYY-MM-DD format' })
  @IsOptional()
  @Matches(DATE_FORMAT_REGEX, { message: `endDate ${DATE_FORMAT_MESSAGE}` })
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  currentlyStudying?: boolean;
}
