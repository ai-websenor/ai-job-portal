import { UserRole } from "@ai-job-portal/common";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsMobilePhone, IsEnum } from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: "John",
    description: "User first name",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "User last name",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: "9876543210",
    description: "User mobile number",
  })
  @IsMobilePhone("en-IN") // 🇮🇳 India format
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({
    example: "user@example.com",
    description: "User email address",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "Password123!",
    description: "Password (min 8 chars, must include uppercase, lowercase, number, and special char)",
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: "Password must contain uppercase, lowercase, number, and special character",
  })
  password: string;

  @ApiProperty({
    example: "Password123!",
    description: "Confirm password (must match password)",
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.CANDIDATE,
    description: "User role",
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
