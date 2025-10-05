import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { UserRole } from '@ai-job-portal/common';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Password (min 8 chars, must include uppercase, lowercase, number, and special char)',
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must contain uppercase, lowercase, number, and special character',
    },
  )
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.JOB_SEEKER,
    description: 'User role',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
