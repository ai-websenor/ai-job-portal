import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVideoStatusDto {
  @ApiProperty({
    enum: ['approved', 'rejected'],
    description: 'New video status',
  })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Reason for rejection (required if status is rejected)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
