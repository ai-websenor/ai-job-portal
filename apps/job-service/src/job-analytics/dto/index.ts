import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShareChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  COPY_LINK = 'copy_link',
}

export class TrackShareDto {
  @ApiProperty({
    description: 'The platform/channel through which the job was shared',
    enum: ShareChannel,
    enumName: 'ShareChannel',
    example: 'copy_link',
    examples: {
      whatsapp: { value: 'whatsapp', summary: 'Shared via WhatsApp' },
      email: { value: 'email', summary: 'Shared via Email' },
      linkedin: { value: 'linkedin', summary: 'Shared via LinkedIn' },
      twitter: { value: 'twitter', summary: 'Shared via Twitter/X' },
      facebook: { value: 'facebook', summary: 'Shared via Facebook' },
      copy_link: { value: 'copy_link', summary: 'User copied the job link to clipboard' },
    },
  })
  @IsEnum(ShareChannel)
  shareChannel: ShareChannel;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter analytics from this date (inclusive)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter analytics up to this date (inclusive)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ShareStatsResponseDto {
  @ApiProperty({ description: 'Total number of shares across all channels', example: 42 })
  totalShares: number;

  @ApiProperty({
    description: 'Share count broken down by channel',
    example: { whatsapp: 15, linkedin: 10, copy_link: 8, email: 5, twitter: 3, facebook: 1 },
  })
  sharesByChannel: Record<string, number>;
}

export class JobAnalyticsResponseDto {
  @ApiProperty({ description: 'Job ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  jobId: string;

  @ApiProperty({ description: 'Total page views (including repeat visits)', example: 230 })
  totalViews: number;

  @ApiProperty({ description: 'Unique users who viewed the job', example: 185 })
  uniqueViews: number;

  @ApiProperty({ description: 'Total shares across all channels', example: 42 })
  totalShares: number;

  @ApiProperty({ description: 'Number of applications submitted', example: 12 })
  applicationCount: number;

  @ApiPropertyOptional({
    description: 'Share count broken down by channel',
    example: { whatsapp: 15, linkedin: 10, copy_link: 8 },
  })
  sharesByChannel?: Record<string, number>;
}
