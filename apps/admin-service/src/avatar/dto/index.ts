import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAvatarDto {
  @ApiProperty({ description: 'Avatar name/label', example: 'Professional Avatar 1' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateAvatarDto {
  @ApiPropertyOptional({ description: 'Avatar name/label' })
  @IsString()
  @IsOptional()
  name?: string;
}

export class AvatarQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsBoolean()
  @IsOptional()
  activeOnly?: boolean;
}

export class UpdateAvatarStatusDto {
  @ApiProperty({ description: 'Active status', example: true })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateAvatarOrderDto {
  @ApiProperty({ description: 'Display order (lower numbers appear first)', example: 1 })
  @IsInt()
  @Min(0)
  displayOrder: number;
}
