import { IsString, IsOptional, IsDate, IsEnum, IsInt, Min, Max, Length, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other', 'not_specified'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'not_specified'])
  gender?: 'male' | 'female' | 'other' | 'not_specified';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 20)
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 20)
  pinCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionalSummary?: string;

  @ApiPropertyOptional({ enum: ['public', 'private', 'semi_private'] })
  @IsOptional()
  @IsEnum(['public', 'private', 'semi_private'])
  visibility?: 'public' | 'private' | 'semi_private';
}
