import { IsString, IsOptional, IsBoolean, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for employer profile
 * Includes all employer fields with proper camelCase naming
 */
export class EmployerProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  companyId?: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  subscriptionPlan: string;

  @ApiPropertyOptional()
  subscriptionExpiresAt?: Date;

  // Optional personal fields
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other', 'not_specified'] })
  gender?: string;

  @ApiPropertyOptional()
  profilePhoto?: string;

  @ApiPropertyOptional()
  visibility?: boolean;

  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional()
  designation?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country from user account' })
  country?: string | null;

  @ApiPropertyOptional({ example: 'Maharashtra', description: 'State from user account' })
  state?: string | null;

  @ApiPropertyOptional({ example: 'Mumbai', description: 'City from user account' })
  city?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional()
  company?: any;

  @ApiPropertyOptional({ description: 'Current active subscription, or null if none' })
  activeSubscription?: any | null;
}

/**
 * DTO for updating employer profile
 * All fields are optional to support partial updates
 */
export class UpdateEmployerProfileDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    enum: ['male', 'female', 'other', 'not_specified'],
    description: 'Gender of the employer',
  })
  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'not_specified'])
  gender?: string;

  @ApiPropertyOptional({ maxLength: 500, description: 'Profile photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profilePhoto?: string;

  @ApiPropertyOptional({ description: 'Profile visibility' })
  @IsOptional()
  @IsBoolean()
  visibility?: boolean;

  @ApiPropertyOptional({ maxLength: 100, description: 'Department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'Job designation/title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'City (also accepted as locationCity)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'State (also accepted as locationState)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Country (also accepted as locationCountry)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'City (alias for city)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'State (alias for state)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationState?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'Country (alias for country)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCountry?: string;
}
