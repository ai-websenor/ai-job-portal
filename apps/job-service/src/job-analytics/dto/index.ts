import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ShareChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  COPY_LINK = 'copy_link',
}

export class TrackShareDto {
  @ApiProperty({ description: 'Share channel', enum: ShareChannel })
  @IsEnum(ShareChannel)
  shareChannel: ShareChannel;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class JobAnalyticsResponseDto {
  @ApiProperty() jobId: string;
  @ApiProperty() totalViews: number;
  @ApiProperty() uniqueViews: number;
  @ApiProperty() totalShares: number;
  @ApiProperty() applicationCount: number;
  @ApiPropertyOptional() sharesByChannel?: Record<string, number>;
  @ApiPropertyOptional() viewsByDate?: Array<{ date: string; count: number }>;
}
