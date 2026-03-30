import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ example: 'AI Job Portal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platformName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'support@aijobportal.com' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+1-800-123-4567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'contact@aijobportal.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '123 Business Ave, Suite 100, City, State 12345' })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiPropertyOptional({ example: 'https://aijobportal.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  domainUrl?: string;

  @ApiPropertyOptional({
    example: 'You are receiving this email because you have an account with AI Job Portal.',
  })
  @IsOptional()
  @IsString()
  footerText?: string;
}
