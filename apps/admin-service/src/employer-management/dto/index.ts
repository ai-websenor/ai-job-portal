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
// CREATE EMPLOYER DTO (Admin creates employer)
// ============================================

export class CreateEmployerDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'employer@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid mobile number format' })
  mobile: string;

  @ApiPropertyOptional({ example: 'HR Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({ example: 'Human Resources' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}

// ============================================
// LIST EMPLOYERS DTO (Admin lists employers)
// ============================================

export class ListEmployersDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by email or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isVerified?: boolean;
}

// ============================================
// UPDATE EMPLOYER DTO (Admin updates employer)
// ============================================

export class UpdateEmployerDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'employer@newcompany.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid mobile number format' })
  mobile?: string;

  @ApiPropertyOptional({ example: 'Senior HR Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({ example: 'Human Resources' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class EmployerResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'employer@company.com' })
  email: string;

  @ApiProperty({ example: '+919876543210' })
  mobile: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiPropertyOptional({ example: 'HR Manager' })
  designation?: string;

  @ApiPropertyOptional({ example: 'Human Resources' })
  department?: string;

  @ApiPropertyOptional()
  company?: {
    id: string;
    name: string;
    industry?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateEmployerDataDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  employerId: string;
}

export class DeleteEmployerDataDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  employerId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;
}

export class PaginationDto {
  @ApiProperty({ example: 10 })
  totalEmployers: number;

  @ApiProperty({ example: 1 })
  pageCount: number;

  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: false })
  hasNextPage: boolean;
}

export class CreateEmployerResponseDto {
  @ApiProperty({ type: CreateEmployerDataDto })
  data: CreateEmployerDataDto;

  @ApiProperty({ example: 'Employer created successfully' })
  message: string;
}

export class PaginatedEmployersResponseDto {
  @ApiProperty({ type: [EmployerResponseDto] })
  data: EmployerResponseDto[];

  @ApiProperty({ example: 'Employers fetched successfully' })
  message: string;

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
