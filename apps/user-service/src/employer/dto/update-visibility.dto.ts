import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateVisibilityDto {
  @ApiProperty({
    description: 'Profile visibility status',
    enum: ['public', 'private'],
    example: 'private',
  })
  @IsNotEmpty()
  @IsEnum(['public', 'private'], {
    message: 'Visibility must be either public or private',
  })
  visibility: 'public' | 'private';
}
