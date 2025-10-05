import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'verification-token-here',
    description: 'Email verification token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to resend verification',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
