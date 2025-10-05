import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({
    example: 'Password123!',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class Verify2FADto {
  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code from authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'TOTP code must be a 6-digit number',
  })
  token: string;
}

export class Disable2FADto {
  @ApiProperty({
    example: 'Password123!',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code from authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'TOTP code must be a 6-digit number',
  })
  token: string;
}
