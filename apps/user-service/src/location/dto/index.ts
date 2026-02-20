import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AutocompleteQueryDto {
  @ApiProperty({ description: 'Search input text', example: 'Bangalo' })
  @IsString()
  @IsNotEmpty()
  input: string;

  @ApiPropertyOptional({
    description: 'Place types filter',
    example: '(cities)',
    default: '(cities)',
  })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({
    description: 'Language for results',
    example: 'en',
    default: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;
}

export class ReverseGeocodeQueryDto {
  @ApiProperty({ description: 'Latitude', example: 12.9716 })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 77.5946 })
  @IsNumber()
  @Type(() => Number)
  lng: number;
}
