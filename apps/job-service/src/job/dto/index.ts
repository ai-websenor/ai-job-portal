import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsUUID, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty() @IsString() @MaxLength(255)
  title: string;

  @ApiProperty() @IsString()
  description: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  requirements?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  responsibilities?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  benefits?: string;

  @ApiProperty({ enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'] })
  @IsEnum(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
  employmentType: string;

  @ApiProperty({ enum: ['remote', 'onsite', 'hybrid'] })
  @IsEnum(['remote', 'onsite', 'hybrid'])
  workMode: string;

  @ApiProperty({ enum: ['entry', 'mid', 'senior', 'lead', 'executive'] })
  @IsEnum(['entry', 'mid', 'senior', 'lead', 'executive'])
  experienceLevel: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  experienceMin?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  experienceMax?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  showSalary?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  locationCity?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  locationState?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  locationCountry?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true })
  skillIds?: string[];
}

export class UpdateJobDto extends PartialType(CreateJobDto) {}
