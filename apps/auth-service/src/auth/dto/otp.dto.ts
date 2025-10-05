import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    example: '+1234567890',
    description: 'Mobile number with country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Mobile number must be in E.164 format (e.g., +1234567890)',
  })
  mobile: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: '+1234567890',
    description: 'Mobile number with country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Mobile number must be in E.164 format',
  })
  mobile: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'OTP must be a 6-digit number',
  })
  otp: string;
}
