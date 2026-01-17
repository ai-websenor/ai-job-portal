import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsNumber } from 'class-validator';

export enum BannerPosition {
  HOMEPAGE_HERO = 'homepage_hero',
  HOMEPAGE_SIDEBAR = 'homepage_sidebar',
  JOB_LISTING_TOP = 'job_listing_top',
  JOB_DETAIL_SIDEBAR = 'job_detail_sidebar',
  DASHBOARD_TOP = 'dashboard_top',
  FOOTER = 'footer',
}

export enum TargetAudience {
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
  TEAM_MEMBER = 'team_member',
}

export class CreateBannerDto {
  @ApiProperty({ description: 'Banner title/alt text' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Banner image URL' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Link URL when clicked' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiProperty({ enum: BannerPosition, description: 'Display position' })
  @IsEnum(BannerPosition)
  position: BannerPosition;

  @ApiPropertyOptional({ description: 'Display order (lower = first)', default: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({ enum: TargetAudience, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  targetAudience?: TargetAudience[];

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBannerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ enum: BannerPosition })
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

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
  isActive?: boolean;
}

export class BannerQueryDto {
  @ApiPropertyOptional({ enum: BannerPosition })
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @ApiPropertyOptional({ enum: TargetAudience })
  @IsOptional()
  @IsEnum(TargetAudience)
  audience?: TargetAudience;
}
