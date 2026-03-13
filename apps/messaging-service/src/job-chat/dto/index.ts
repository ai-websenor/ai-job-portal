import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JobChatMessageDto {
  @ApiProperty({
    description: 'Job listing UUID to chat about',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  jobId: string;

  @ApiProperty({ description: 'Candidate question or message', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}

export class JobChatResponseDto {
  @ApiProperty({ description: 'AI response text' })
  response: string;

  @ApiProperty({ description: 'Multi-bubble message array', type: [String] })
  messages: string[];

  @ApiProperty({ description: 'Follow-up question suggestions (max 3)', type: [String] })
  suggestions: string[];
}
