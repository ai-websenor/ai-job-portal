import { IsString, IsOptional, IsBoolean, IsEnum, IsDate, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateWorkExperienceDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  companyName: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  jobTitle: string;

  @ApiPropertyOptional({ enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance'] })
  @IsOptional()
  @IsEnum(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

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
}
