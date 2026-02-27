import { IsString, IsOptional, IsUUID, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @ApiProperty({ description: 'File name', example: 'resume_2026.pdf' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'S3 presigned URL or file URL',
    example: 'https://s3.ap-south-1.amazonaws.com/bucket/docs/resume_2026.pdf',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 245760 })
  @IsOptional()
  size?: number;
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Message body content',
    example: 'Hi, when can we schedule the interview? I am available next week.',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Message subject line (optional)',
    example: 'Interview scheduling',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'File attachments array',
    type: [AttachmentDto],
    example: [
      {
        name: 'resume.pdf',
        url: 'https://s3.amazonaws.com/bucket/resume.pdf',
        type: 'application/pdf',
        size: 245760,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class MessageQueryDto {
  @ApiPropertyOptional({
    description: 'If true, returns only unread messages',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50, example: 50 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}

export class MarkReadDto {
  @ApiProperty({
    description: 'Array of message IDs to mark as read',
    type: [String],
    example: ['f6a7b8c9-d0e1-2345-fa67-890123456789', 'a7b8c9d0-e1f2-3456-ab78-901234567890'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}

export class UserProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Ahmed' })
  firstName: string;

  @ApiProperty({ example: 'Anjims' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'S3 URL of profile photo',
    example: 'https://s3.ap-south-1.amazonaws.com/bucket/photos/ahmed.jpg',
    nullable: true,
  })
  profilePhoto?: string | null;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'f6a7b8c9-d0e1-2345-fa67-890123456789' })
  id: string;

  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-ef56-789012345678' })
  threadId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  senderId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' })
  recipientId: string;

  @ApiPropertyOptional({ example: 'Interview scheduling' })
  subject?: string;

  @ApiProperty({ example: 'Hi, when can we schedule the interview?' })
  body: string;

  @ApiPropertyOptional({
    description: 'Parsed attachment array (null if no attachments)',
    type: [AttachmentDto],
    example: [
      {
        name: 'resume.pdf',
        url: 'https://s3.amazonaws.com/bucket/resume.pdf',
        type: 'application/pdf',
        size: 245760,
      },
    ],
  })
  attachments?: AttachmentDto[];

  @ApiProperty({
    description: 'Message delivery status',
    enum: ['sent', 'delivered', 'read'],
    example: 'delivered',
  })
  status: string;

  @ApiProperty({ description: 'Whether the message has been read', example: false })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when message was read (null if unread)',
    example: '2026-02-27T10:35:00.000Z',
  })
  readAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when message was delivered to recipient socket (null if not delivered)',
    example: '2026-02-27T10:30:05.000Z',
  })
  deliveredAt?: Date;

  @ApiProperty({ example: '2026-02-27T10:30:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Sender profile (name + photo)',
    type: UserProfileDto,
  })
  sender?: UserProfileDto;

  @ApiPropertyOptional({
    description: 'Recipient profile (name + photo)',
    type: UserProfileDto,
  })
  recipient?: UserProfileDto;
}
