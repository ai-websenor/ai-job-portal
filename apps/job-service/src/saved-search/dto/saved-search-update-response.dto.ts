import { ApiProperty } from '@nestjs/swagger';

export class SavedSearchUpdateResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Saved search updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Saved search ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Whether job alerts are enabled',
    example: true,
  })
  alertEnabled: boolean;

  @ApiProperty({
    description: 'Frequency of job alerts',
    example: 'daily',
  })
  alertFrequency: string;

  @ApiProperty({
    description: 'Channels to send alerts through',
    example: ['email', 'push'],
    type: [String],
  })
  alertChannels: string[];
}
