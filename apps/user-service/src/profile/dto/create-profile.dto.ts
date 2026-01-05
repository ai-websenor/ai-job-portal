import { IsString, IsOptional, IsDate, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateProfileDto {
  @ApiProperty({
    example: 'FirstName',
    description: 'First name of the user',
  })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiPropertyOptional({
    example: 'MiddleName',
    description: 'Middle name of the user',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value === '' ? undefined : value))
  middleName?: string;

  @ApiPropertyOptional({
    example: 'LastName',
    description: 'Last name of the user',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value === '' ? undefined : value))
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
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'not_specified'])
  gender?: 'male' | 'female' | 'other' | 'not_specified';

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address (display only)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => (value === '' ? undefined : value))
  email?: string;

  @ApiPropertyOptional({
    example: '+910000000000',
    description: 'Primary phone number',
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Transform(({ value }) => (value === '' ? undefined : value))
  phone?: string;

  @ApiPropertyOptional({
    example: '+910000000001',
    description: 'Alternate phone number',
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Transform(({ value }) => (value === '' ? undefined : value))
  alternatePhone?: string;

  @ApiPropertyOptional({
    example: 'Address Line 1',
    description: 'Primary address line',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => (value === '' ? undefined : value))
  addressLine1?: string;

  @ApiPropertyOptional({
    example: 'Address Line 2',
    description: 'Secondary address line',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => (value === '' ? undefined : value))
  addressLine2?: string;

  @ApiPropertyOptional({
    example: 'CityName',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value === '' ? undefined : value))
  city?: string;

  @ApiPropertyOptional({
    example: 'StateName',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value === '' ? undefined : value))
  state?: string;

  @ApiPropertyOptional({
    example: 'CountryName',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value === '' ? undefined : value))
  country?: string;

  @ApiPropertyOptional({
    example: '000000',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => (value === '' ? undefined : value))
  pinCode?: string;

  @ApiPropertyOptional({
    example: 'Brief professional summary',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  professionalSummary?: string;

  @ApiPropertyOptional({
    enum: ['public', 'private', 'semi_private'],
    example: 'public',
  })
  @IsOptional()
  @IsEnum(['public', 'private', 'semi_private'])
  visibility?: 'public' | 'private' | 'semi_private';
}
