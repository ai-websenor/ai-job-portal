import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsArray,
  IsIn,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORT_CATEGORY_VALUES } from '../support.constants';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Initial message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ enum: SUPPORT_CATEGORY_VALUES })
  @IsOptional()
  @IsIn(SUPPORT_CATEGORY_VALUES)
  category?: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Attachment URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class AddTicketMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Internal note (admin only)', default: false })
  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;

  @ApiPropertyOptional({ description: 'Attachment URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Assigned admin user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

export class TicketQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: SUPPORT_CATEGORY_VALUES })
  @IsOptional()
  @IsIn(SUPPORT_CATEGORY_VALUES)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}

// Attachment types accepted for bug reports: screenshots, screen recordings, PDFs
export const SUPPORT_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
];

// Larger than chat attachments to allow short screen recordings
export const MAX_SUPPORT_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50 MB

export class SupportAttachmentUploadUrlDto {
  @ApiProperty({
    description: 'Original filename of the attachment',
    example: 'bug-screenshot.png',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/png',
    enum: SUPPORT_ATTACHMENT_TYPES,
  })
  @IsString()
  @IsIn(SUPPORT_ATTACHMENT_TYPES, {
    message: `contentType must be one of: ${SUPPORT_ATTACHMENT_TYPES.join(', ')}`,
  })
  contentType: string;

  @ApiPropertyOptional({
    description: 'File size in bytes (max 50 MB). Used for server-side validation.',
    example: 245760,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fileSize?: number;
}

export class TicketAnalyticsDto {
  @ApiPropertyOptional({ description: 'Include tickets created on/after this date (ISO)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Include tickets created on/before this date (ISO)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
