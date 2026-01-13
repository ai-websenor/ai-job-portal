import { ApiProperty } from '@nestjs/swagger';

export class SavedSearchDeleteResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Saved search deleted successfully',
  })
  message: string;
}
