import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// CREATE EMPLOYER DTO (Super Employer creates employer)
// ============================================

export class CreateCompanyEmployerDto {
  @ApiProperty({
    example: 'Rahul',
    description: 'First name of the employer to be added',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    example: 'Sharma',
    description: 'Last name of the employer to be added',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    example: 'rahul.sharma@techcorp.com',
    description: 'Email address of the employer (must be unique across the platform)',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description:
      'Password for the employer account. Must contain at least 8 characters with uppercase, lowercase, number, and special character.',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description: 'Must match the password field exactly',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Mobile number with country code (e.g., +91 for India)',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid mobile number format' })
  mobile: string;

  @ApiPropertyOptional({
    example: 'HR Manager',
    description: 'Job designation/title of the employer within the company',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({
    example: 'Human Resources',
    description: 'Department the employer belongs to within the company',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}

// ============================================
// LIST EMPLOYERS DTO (Super Employer lists employers)
// ============================================

export class ListCompanyEmployersDto {
  @ApiPropertyOptional({ description: 'Page number (starts from 1)', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by email, first name, or last name (case-insensitive)',
    example: 'rahul',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive'],
    description: 'Filter employers by account status',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({
    description: 'Filter by email verification status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter from date (inclusive, ISO 8601 format)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (inclusive, ISO 8601 format)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    default: 'createdAt',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// UPDATE EMPLOYER DTO (Super Employer updates employer)
// ============================================

export class UpdateCompanyEmployerDto {
  @ApiPropertyOptional({
    example: 'Rahul',
    description: 'Updated first name',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Sharma',
    description: 'Updated last name',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'rahul.new@techcorp.com',
    description: 'Updated email address (must be unique across the platform)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Updated mobile number with country code',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid mobile number format' })
  mobile?: string;

  @ApiPropertyOptional({
    example: 'Senior HR Manager',
    description: 'Updated designation/title',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({
    example: 'Human Resources',
    description: 'Updated department',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Set employer account as active or inactive',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Set employer verification status',
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class CompanyEmployerCompanyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'TechCorp Solutions' })
  name: string;

  @ApiPropertyOptional({ example: 'Information Technology' })
  industry?: string;
}

export class CompanyEmployerResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique employer profile ID',
  })
  id: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440000',
    description: 'Unique user account ID',
  })
  userId: string;

  @ApiProperty({ example: 'Rahul', description: 'First name of the employer' })
  firstName: string;

  @ApiProperty({ example: 'Sharma', description: 'Last name of the employer' })
  lastName: string;

  @ApiProperty({ example: 'rahul.sharma@techcorp.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: '+919876543210', description: 'Mobile number' })
  mobile: string;

  @ApiProperty({ example: true, description: 'Whether the account is active' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Whether the employer is verified' })
  isVerified: boolean;

  @ApiPropertyOptional({ example: 'HR Manager', description: 'Job designation' })
  designation?: string;

  @ApiPropertyOptional({ example: 'Human Resources', description: 'Department' })
  department?: string;

  @ApiPropertyOptional({
    type: CompanyEmployerCompanyDto,
    description: 'Company the employer belongs to',
  })
  company?: CompanyEmployerCompanyDto;

  @ApiProperty({ example: '2025-06-15T10:30:00.000Z', description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({
    example: '2025-06-15T10:30:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

export class CreateCompanyEmployerDataDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440000',
    description: 'Created user account ID',
  })
  userId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Created employer profile ID',
  })
  employerId: string;
}

export class DeleteCompanyEmployerDataDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  employerId: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440000' })
  userId: string;
}

export class CompanyEmployerPaginationDto {
  @ApiProperty({ example: 10, description: 'Total number of employers in the company' })
  totalEmployers: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  pageCount: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ example: false, description: 'Whether more pages are available' })
  hasNextPage: boolean;
}

export class CreateCompanyEmployerResponseDto {
  @ApiProperty({ type: CreateCompanyEmployerDataDto })
  data: CreateCompanyEmployerDataDto;

  @ApiProperty({ example: 'Employer created successfully' })
  message: string;
}

export class PaginatedCompanyEmployersResponseDto {
  @ApiProperty({ type: [CompanyEmployerResponseDto] })
  data: CompanyEmployerResponseDto[];

  @ApiProperty({ example: 'Employers fetched successfully' })
  message: string;

  @ApiProperty({ type: CompanyEmployerPaginationDto })
  pagination: CompanyEmployerPaginationDto;
}
