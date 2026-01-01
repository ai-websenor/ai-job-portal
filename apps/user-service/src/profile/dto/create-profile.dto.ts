import { IsString, IsOptional, IsDate, IsEnum, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProfileDto {
  @ApiPropertyOptional({
    example: 'FirstName',
    description: 'First name of the user',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'MiddleName',
    description: 'Middle name of the user',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  middleName?: string;

  @ApiPropertyOptional({
    example: 'LastName',
    description: 'Last name of the user',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    example: '1995-01-01T00:00:00.000Z',
    description: 'Date of birth',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    enum: ['male', 'female', 'other', 'not_specified'],
    example: 'not_specified',
    description: 'Gender of the user',
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'not_specified'])
  gender?: 'male' | 'female' | 'other' | 'not_specified';

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address (display purpose only)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  email?: string;

  @ApiPropertyOptional({
    example: '+910000000000',
    description: 'Primary phone number',
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  phone?: string;

  @ApiPropertyOptional({
    example: '+910000000001',
    description: 'Alternate phone number',
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  alternatePhone?: string;

  @ApiPropertyOptional({
    example: 'Address Line 1',
    description: 'Primary address line',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  addressLine1?: string;

  @ApiPropertyOptional({
    example: 'Address Line 2',
    description: 'Secondary address line',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  addressLine2?: string;

  @ApiPropertyOptional({
    example: 'CityName',
    description: 'City name',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({
    example: 'StateName',
    description: 'State name',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @ApiPropertyOptional({
    example: 'CountryName',
    description: 'Country name',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @ApiPropertyOptional({
    example: '000000',
    description: 'Postal / PIN code',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  pinCode?: string;

  @ApiPropertyOptional({
    example: 'Brief professional summary goes here',
    description: 'Short professional summary',
  })
  @IsOptional()
  @IsString()
  professionalSummary?: string;

  @ApiPropertyOptional({
    enum: ['public', 'private', 'semi_private'],
    example: 'public',
    description: 'Profile visibility setting',
  })
  @IsOptional()
  @IsEnum(['public', 'private', 'semi_private'])
  visibility?: 'public' | 'private' | 'semi_private';
}
