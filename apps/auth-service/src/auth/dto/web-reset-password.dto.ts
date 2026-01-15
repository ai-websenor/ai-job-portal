import {ApiProperty} from '@nestjs/swagger';
import {IsEmail, IsNotEmpty, IsString, MinLength, Matches} from 'class-validator';

/**
 * DTO for Web Reset Password Flow
 * Used after OTP verification to reset password with a reset token
 */
export class WebResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Reset token received after OTP verification',
  })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'New password (min 8 chars, must include uppercase, lowercase, number, and special char)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Confirm new password (must match newPassword)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  confirmNewPassword: string;
}

/**
 * DTO for Web OTP Verification (without password reset)
 * Used to verify OTP and generate reset token for web flow
 */
export class VerifyOtpWebDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code sent to email',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
