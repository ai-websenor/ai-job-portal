import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../validators';

// ============================================
// Step 1: Send Mobile OTP
// ============================================

export class SendMobileOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Mobile number in E.164 format with country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{9,14}$/, {
    message: 'Invalid mobile number format. Use E.164 format (e.g., +919876543210)',
  })
  mobile: string;
}

export class SendMobileOtpResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionToken: string;

  @ApiProperty({ example: 'OTP sent to your mobile number' })
  message: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'OTP code (only returned in development mode)',
  })
  otp?: string;
}

// ============================================
// Step 2: Verify Mobile OTP
// ============================================

export class VerifyMobileOtpDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via SMS' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

export class VerifyMobileOtpResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionToken: string;

  @ApiProperty({ example: 'Mobile verified successfully' })
  message: string;
}

// ============================================
// Step 3: Send Email OTP
// ============================================

export class SendEmailOtpDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ApiProperty({
    example: 'hr@techcorp.com',
    description: 'Company domain email preferred',
  })
  @IsEmail()
  email: string;
}

export class SendEmailOtpResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionToken: string;

  @ApiProperty({ example: 'OTP sent to your email' })
  message: string;

  @ApiPropertyOptional({
    example: '654321',
    description: 'OTP code (only returned in development mode)',
  })
  otp?: string;
}

// ============================================
// Step 4: Verify Email OTP
// ============================================

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ApiProperty({ example: '654321', description: '6-digit OTP received via email' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

export class VerifyEmailOtpResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionToken: string;

  @ApiProperty({ example: 'Email verified successfully' })
  message: string;
}

// ============================================
// Step 5: Basic Details
// ============================================

export class BasicDetailsDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ApiProperty({
    example: 'individual',
    enum: ['individual', 'company'],
    description: 'Type of employer account',
  })
  @IsEnum(['individual', 'company'] as const)
  accountType: 'individual' | 'company';

  @ApiProperty({ example: 'Rajesh' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Kumar' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;
}

export class BasicDetailsResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sessionToken: string;

  @ApiProperty({ example: 'Basic details saved successfully' })
  message: string;
}

// ============================================
// Step 6: Company Details & Complete
// ============================================

export class CompanyDetailsDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @ApiProperty({ example: 'TechCorp Solutions Pvt Ltd' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName: string;

  @ApiProperty({ example: 'ABCDE1234F', description: 'PAN number of the company' })
  @IsString()
  @MaxLength(20)
  panNumber: string;

  @ApiProperty({ example: '29AABCI1234A1Z5', description: 'GST registration number' })
  @IsString()
  @MaxLength(20)
  gstNumber: string;

  @ApiProperty({ example: 'U72200KA2020PTC123456', description: 'Corporate Identification Number' })
  @IsString()
  @MaxLength(25)
  cinNumber: string;
}

export class CompanyRegistrationUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ApiProperty({ example: 'employer' })
  role: string;

  @ApiProperty({ example: 'Rajesh' })
  firstName: string;

  @ApiProperty({ example: 'Kumar' })
  lastName: string;

  @ApiProperty({ example: 'hr@techcorp.com' })
  email: string;

  @ApiProperty({ example: '+919876543210' })
  mobile: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: true })
  isMobileVerified: boolean;
}

export class CompanyRegistrationCompanyDto {
  @ApiProperty({ example: 'comp-1234-5678-90ab-cdef11112222' })
  companyId: string;

  @ApiProperty({ example: 'TechCorp Solutions Pvt Ltd' })
  companyName: string;

  @ApiProperty({ example: 'techcorp-solutions-pvt-ltd-m1abc2' })
  slug: string;

  @ApiProperty({ example: 'pending' })
  verificationStatus: string;
}

export class CompanyRegistrationCompleteResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 31536000 })
  expiresIn: number;

  @ApiProperty({ type: CompanyRegistrationUserDto })
  user: CompanyRegistrationUserDto;

  @ApiProperty({ type: CompanyRegistrationCompanyDto })
  company: CompanyRegistrationCompanyDto;

  @ApiProperty({ example: 'Company registration completed successfully' })
  message: string;
}
