import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}

export class CreateMediaDto {
  @ApiProperty({ description: 'Media type', enum: MediaType })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiProperty({ description: 'Media URL' })
  @IsString()
  mediaUrl: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Category (office, team, events, etc.)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Caption' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  displayOrder?: number;
}

export class UpdateMediaDto extends PartialType(CreateMediaDto) {}
