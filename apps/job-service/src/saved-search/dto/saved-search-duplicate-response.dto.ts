import { ApiProperty } from '@nestjs/swagger';

export class SavedSearchDuplicateResponseDto {
  @ApiProperty({
    description: 'Message indicating search already exists',
    example: 'Search already saved',
  })
  message: string;

  @ApiProperty({
    description: 'Saved search ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

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
    },
  })
  searchCriteria: Record<string, any>;

  @ApiProperty({
    description: 'Whether job alerts are enabled',
    example: true,
  })
  alertEnabled: boolean;
}
