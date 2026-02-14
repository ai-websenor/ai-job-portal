import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVideoModerationDto {
  @ApiProperty({
    enum: ['approved', 'rejected'],
    description: 'New moderation status for the video',
  })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Reason for rejection (required when status is rejected)',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
