import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ChatSender {
  USER = 'user',
  BOT = 'bot',
  AGENT = 'agent',
}

export class CreateChatSessionDto {
  @ApiPropertyOptional({ description: 'Initial message from user' })
  @IsOptional()
  @IsString()
  initialMessage?: string;
}

export class SendChatMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  message: string;
}

export class ChatQueryDto {
  @ApiPropertyOptional({ description: 'Filter active sessions only' })
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class EndSessionDto {
  @ApiPropertyOptional({ description: 'Satisfaction rating 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  satisfactionRating?: number;
}

export class EscalateDto {
  @ApiProperty({ description: 'Reason for escalation' })
  @IsString()
  reason: string;
}

export class ChatSessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() startedAt: Date;
  @ApiPropertyOptional() endedAt?: Date;
  @ApiProperty() messagesCount: number;
  @ApiProperty() escalatedToHuman: boolean;
  @ApiPropertyOptional() satisfactionRating?: number;
}

export class ChatMessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sessionId: string;
  @ApiProperty({ enum: ChatSender }) sender: ChatSender;
  @ApiProperty() message: string;
  @ApiPropertyOptional() intent?: string;
  @ApiPropertyOptional() confidence?: number;
  @ApiProperty() timestamp: Date;
}
