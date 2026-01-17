import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString } from 'class-validator';

export enum AnnouncementType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum TargetAudience {
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
  TEAM_MEMBER = 'team_member',
}

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Announcement title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Announcement content' })
  @IsString()
  content: string;

  @ApiProperty({ enum: AnnouncementType, description: 'Type of announcement' })
  @IsEnum(AnnouncementType)
  type: AnnouncementType;

  @ApiPropertyOptional({ enum: TargetAudience, isArray: true, description: 'Target audience' })
  @IsOptional()
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  targetAudience?: TargetAudience[];

  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isDismissible?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: AnnouncementType })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ enum: TargetAudience, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  targetAudience?: TargetAudience[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDismissible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
