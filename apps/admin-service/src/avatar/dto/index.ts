import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateAvatarDto {
  @ApiProperty({ description: 'Avatar name/label', example: 'Professional Avatar 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Gender category',
    enum: ['male', 'female', 'other'],
    example: 'male',
  })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;
}

export class UpdateAvatarDto {
  @ApiPropertyOptional({ description: 'Avatar name/label' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Gender category', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ description: 'Display order', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AvatarQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by gender', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ description: 'Search by avatar name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  get offset(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }
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
