import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsUUID, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../validators';

export class RegisterDto {
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

  @ApiProperty({ example: 'user@example.com' })
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
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid mobile number format' })
  mobile: string;

  @ApiProperty({ enum: ['candidate', 'employer'], default: 'candidate' })
  @IsEnum(['candidate', 'employer'] as const)
  role: 'candidate' | 'employer';
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyForgotPasswordOtpDto {
  @ApiProperty({ example: '123456', description: 'The 6-digit OTP sent to user email' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address associated with the OTP' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token received from OTP verification step' })
  @IsString()
  @IsNotEmpty()
  resetPasswordToken: string;

  @ApiProperty({ example: 'NewSecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;

  @ApiProperty({ example: 'NewSecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword: string;
}

export class ResendVerificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

// Response DTOs
export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class VerifyEmailResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class RegisterResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  message: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: 'If email exists, reset instructions sent' })
  message: string;

  @ApiPropertyOptional({ example: '123456', description: 'OTP (DEV only - not returned in production)' })
  otp?: string;
}

export class VerifyForgotPasswordResponseDto {
  @ApiProperty({ example: 'OTP verified successfully' })
  message: string;

  @ApiProperty({ description: 'Token to use for password reset' })
  resetPasswordToken: string;
}
