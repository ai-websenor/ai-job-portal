import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCandidateProfileDto {
  @ApiProperty() @IsString() @MaxLength(100)
  firstName: string;

  @ApiProperty() @IsString() @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  headline?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  summary?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  locationCity?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  locationState?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  locationCountry?: string;
}

export class UpdateCandidateProfileDto extends PartialType(CreateCandidateProfileDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isOpenToWork?: boolean;

  @ApiPropertyOptional() @IsOptional()
  expectedSalaryMin?: number;

  @ApiPropertyOptional() @IsOptional()
  expectedSalaryMax?: number;

  @ApiPropertyOptional() @IsOptional()
  noticePeriodDays?: number;
}

export class AddExperienceDto {
  @ApiProperty() @IsString()
  companyName: string;

  @ApiProperty() @IsString()
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsEnum(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
  employmentType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  location?: string;

  @ApiProperty() @IsString()
  startDate: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;
}

export class AddEducationDto {
  @ApiProperty() @IsString()
  institution: string;

  @ApiProperty() @IsString()
  degree: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  fieldOfStudy?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  grade?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;
}
