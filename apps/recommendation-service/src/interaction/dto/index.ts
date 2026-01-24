import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum InteractionType {
  VIEW = 'view',
  APPLY = 'apply',
  SAVE = 'save',
  SHARE = 'share',
  NOT_INTERESTED = 'not_interested',
}

export class TrackInteractionDto {
  @ApiProperty({ description: 'Job ID' })
  @IsString()
  jobId: string;

  @ApiProperty({ enum: InteractionType, description: 'Type of interaction' })
  @IsEnum(InteractionType)
  interactionType: InteractionType;

  @ApiPropertyOptional({ description: 'Session ID for tracking' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (time_spent, scroll_depth, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BulkTrackInteractionsDto {
  @ApiProperty({ type: [TrackInteractionDto] })
  interactions: TrackInteractionDto[];
}
