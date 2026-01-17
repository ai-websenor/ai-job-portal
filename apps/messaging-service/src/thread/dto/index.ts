import { IsString, IsOptional, IsUUID, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateThreadDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  recipientId: string;

  @ApiPropertyOptional({ description: 'Related job ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Related application ID' })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiProperty({ description: 'Initial message subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Initial message body' })
  @IsString()
  body: string;
}

export class ThreadQueryDto {
  @ApiPropertyOptional({ description: 'Filter by archived status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  archived?: boolean;

  @ApiPropertyOptional({ description: 'Filter by job ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class UpdateThreadDto {
  @ApiPropertyOptional({ description: 'Archive the thread' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class ThreadResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() participants: string[];
  @ApiPropertyOptional() jobId?: string;
  @ApiPropertyOptional() applicationId?: string;
  @ApiPropertyOptional() lastMessageAt?: Date;
  @ApiProperty() isArchived: boolean;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional() lastMessage?: {
    body: string;
    senderId: string;
    createdAt: Date;
  };
  @ApiPropertyOptional() unreadCount?: number;
}
