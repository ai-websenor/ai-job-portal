import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateCandidateVisibilityDto {
  @ApiProperty({
    description: 'Profile visibility status',
    enum: ['public', 'private', 'semi_private'],
    example: 'public',
  })
  @IsNotEmpty()
  @IsEnum(['public', 'private', 'semi_private'], {
    message: 'Visibility must be either public, private, or semi_private',
  })
  visibility: 'public' | 'private' | 'semi_private';
}
