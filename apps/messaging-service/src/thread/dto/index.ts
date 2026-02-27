import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateThreadDto {
  @ApiProperty({
    description: 'Recipient user ID (the person you want to message)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  })
  @IsUUID()
  recipientId: string;

  @ApiPropertyOptional({
    description: 'Related job ID (links the conversation to a specific job)',
    example: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Related application ID (links the conversation to a specific application)',
    example: 'd4e5f6a7-b8c9-0123-defa-456789012345',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'Initial message subject line',
    example: 'Regarding your application for React Developer',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Initial message body content',
    example:
      'Hi, I saw your profile and would like to discuss the React Developer position at our company.',
  })
  @IsString()
  body: string;
}

export class ThreadQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by archived status. true = only archived, false = only active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  archived?: boolean;

  @ApiPropertyOptional({
    description: 'Filter threads by a specific job ID',
    example: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class UpdateThreadDto {
  @ApiPropertyOptional({
    description: 'Set true to archive, false to unarchive',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class ParticipantDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Ahmed' })
  firstName: string;

  @ApiProperty({ example: 'Anjims' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'S3 URL of the profile photo',
    example: 'https://s3.ap-south-1.amazonaws.com/bucket/photos/ahmed.jpg',
    nullable: true,
  })
  profilePhoto?: string | null;

  @ApiProperty({
    description: 'Whether the user is currently online (connected via WebSocket)',
    example: true,
  })
  isOnline: boolean;
}

export class ThreadResponseDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-ef56-789012345678' })
  id: string;

  @ApiProperty({
    description: 'Enriched participant profiles with name, photo, and online status',
    type: [ParticipantDto],
  })
  participants: ParticipantDto[];

  @ApiPropertyOptional({ example: 'c3d4e5f6-a7b8-9012-cdef-345678901234' })
  jobId?: string;

  @ApiPropertyOptional({ example: null })
  applicationId?: string;

  @ApiPropertyOptional({ example: '2026-02-27T10:30:00.000Z' })
  lastMessageAt?: Date;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiProperty({ example: '2026-02-25T09:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Most recent message in the thread (preview)',
    example: {
      body: 'We want to invite you for a quick interview tomorrow.',
      senderId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      createdAt: '2026-02-27T10:30:00.000Z',
      status: 'delivered',
    },
  })
  lastMessage?: {
    body: string;
    senderId: string;
    createdAt: Date;
    status: string;
  };

  @ApiPropertyOptional({
    description: 'Number of unread messages in this thread for the current user',
    example: 3,
  })
  unreadCount?: number;
}
