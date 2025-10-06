import { IsString, IsOptional, IsEnum, IsDate, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEducationDto {
  @ApiProperty({ enum: ['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'] })
  @IsEnum(['high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'])
  level: 'high_school' | 'bachelors' | 'masters' | 'phd' | 'diploma' | 'certificate';

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  institution: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  degree: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  fieldOfStudy?: string;

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
  @Length(1, 50)
  grade?: string;

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
  @IsString()
  @Length(1, 500)
  certificateUrl?: string;
}
