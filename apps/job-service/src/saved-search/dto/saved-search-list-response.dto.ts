import { ApiProperty } from '@nestjs/swagger';

export class SavedSearchItemDto {
  @ApiProperty({
    description: 'Saved search ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this saved search',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Name of the saved search',
    example: 'Remote Backend Jobs',
  })
  name: string;

  @ApiProperty({
    description: 'Search criteria object',
    example: {
      keyword: 'backend',
      jobTypes: ['full_time'],
      locations: ['remote'],
    },
  })
  searchCriteria: Record<string, any>;

  @ApiProperty({
    description: 'Whether job alerts are enabled',
    example: true,
  })
  alertEnabled: boolean;

  @ApiProperty({
    description: 'Frequency of job alerts',
    example: 'weekly',
  })
  alertFrequency: string;

  @ApiProperty({
    description: 'Channels to send alerts through',
    example: ['email'],
    type: [String],
  })
  alertChannels: string[];

  @ApiProperty({
    description: 'Whether the saved search is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp when the search was created',
    example: '2026-01-12T17:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the search was last updated',
    example: '2026-01-12T17:30:00.000Z',
  })
  updatedAt: string;
}

export class SavedSearchListResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Saved searches retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of saved searches',
    type: [SavedSearchItemDto],
  })
  data: SavedSearchItemDto[];

  @ApiProperty({
    description: 'Total number of saved searches',
    example: 1,
  })
  total: number;
}
