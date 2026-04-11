import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

export class CreateContactSubmissionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}

export class UpdateContactSubmissionDto {
  @ApiPropertyOptional({ enum: ['new', 'read', 'responded', 'archived'] })
  @IsOptional()
  @IsEnum(['new', 'read', 'responded', 'archived'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ContactQueryDto {
  @ApiPropertyOptional({ enum: ['new', 'read', 'responded', 'archived'] })
  @IsOptional()
  @IsEnum(['new', 'read', 'responded', 'archived'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
