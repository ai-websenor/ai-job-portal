import { IsString, IsOptional, IsUUID, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() size?: number;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message body content' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Message subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'File attachments', type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class MessageQueryDto {
  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}

export class MarkReadDto {
  @ApiProperty({ description: 'Message IDs to mark as read', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() threadId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() recipientId: string;
  @ApiPropertyOptional() subject?: string;
  @ApiProperty() body: string;
  @ApiPropertyOptional() attachments?: AttachmentDto[];
  @ApiProperty() isRead: boolean;
  @ApiPropertyOptional() readAt?: Date;
  @ApiProperty() createdAt: Date;
}
