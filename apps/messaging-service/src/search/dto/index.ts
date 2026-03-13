import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchMessagesDto {
  @ApiProperty({
    description: 'Search keyword — searches in message body and subject (case-insensitive)',
    example: 'interview',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    description: 'Narrow search to a specific thread',
    example: 'e5f6a7b8-c9d0-1234-ef56-789012345678',
  })
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
