import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  IsNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'WELCOME_CANDIDATE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  templateKey: string;

  @ApiProperty({ example: 'Welcome Candidate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Welcome to {{platformName}}, {{firstName}}!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @ApiProperty({ example: 'Welcome Aboard!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Hi {{firstName}}, thank you for joining our platform.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'Complete Your Profile' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ctaText?: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: ['firstName', 'platformName', 'actionUrl'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({ example: 'Welcome Candidate' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Welcome to {{platformName}}, {{firstName}}!' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({ example: 'Welcome Aboard!' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Hi {{firstName}}, thank you for joining our platform.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'Complete Your Profile' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ctaText?: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: ['firstName', 'platformName', 'actionUrl'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EmailTemplateQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'welcome' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PreviewEmailTemplateDto {
  @ApiPropertyOptional({
    example: {
      firstName: 'John Doe',
      jobTitle: 'Software Engineer',
      companyName: 'Google',
      interviewDate: 'Tomorrow 10 AM',
      actionUrl: 'https://example.com/action',
    },
  })
  @IsOptional()
  sampleData?: Record<string, string>;
}
