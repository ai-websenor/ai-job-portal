import { IsString, IsUUID, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description:
      'Conversation key. Send the same value for every message in one chat window so the ' +
      'assistant keeps context, and a new value to start a fresh conversation. Omit it and ' +
      'each message is answered without history. Signed-out visitors MUST send a unique ' +
      'value per browser session — otherwise they share one conversation with every other ' +
      'anonymous visitor to the same job.',
    example: 'job-550e8400-1a2b3c4d5e6f',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]+$/, {
    message: 'sessionId may only contain letters, numbers, and . _ : -',
  })
  sessionId?: string;
}

export class JobChatResponseDto {
  @ApiProperty({ description: 'AI response text' })
  response: string;

  @ApiProperty({ description: 'Multi-bubble message array', type: [String] })
  messages: string[];

  @ApiProperty({ description: 'Follow-up question suggestions (max 3)', type: [String] })
  suggestions: string[];

  @ApiProperty({
    description: 'Conversation key this turn was recorded under. Echo it back on the next message.',
  })
  sessionId: string;

  @ApiProperty({
    description:
      'True when the answer was assembled from the job listing itself because the AI model was ' +
      'unavailable. The answer is still accurate but plainer than usual.',
  })
  degraded: boolean;
}
