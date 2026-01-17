import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsUrl, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CompanySize {
  SMALL = '1-10',
  MEDIUM = '11-50',
  LARGE = '51-200',
  ENTERPRISE = '201-500',
  CORPORATE = '500+',
}

export enum CompanyType {
  STARTUP = 'startup',
  SME = 'sme',
  MNC = 'mnc',
  GOVERNMENT = 'government',
}

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString() @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsOptional() @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size', enum: CompanySize })
  @IsOptional() @IsEnum(CompanySize)
  companySize?: CompanySize;

  @ApiPropertyOptional({ description: 'Company type', enum: CompanyType })
  @IsOptional() @IsEnum(CompanyType)
  companyType?: CompanyType;

  @ApiPropertyOptional({ description: 'Year established' })
  @IsOptional() @IsNumber() @Min(1800) @Max(2100) @Type(() => Number)
  yearEstablished?: number;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional() @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company mission' })
  @IsOptional() @IsString()
  mission?: string;

  @ApiPropertyOptional({ description: 'Company culture' })
  @IsOptional() @IsString()
  culture?: string;

  @ApiPropertyOptional({ description: 'Benefits offered' })
  @IsOptional() @IsString()
  benefits?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional() @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Banner URL' })
  @IsOptional() @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Tagline' })
  @IsOptional() @IsString() @MaxLength(255)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Headquarters location' })
  @IsOptional() @IsString()
  headquarters?: string;

  @ApiPropertyOptional({ description: 'Employee count' })
  @IsOptional() @IsNumber() @Type(() => Number)
  employeeCount?: number;

  @ApiPropertyOptional({ description: 'LinkedIn URL' })
  @IsOptional() @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter URL' })
  @IsOptional() @IsString()
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'Facebook URL' })
  @IsOptional() @IsString()
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'PAN Number' })
  @IsOptional() @IsString() @MaxLength(20)
  panNumber?: string;

  @ApiPropertyOptional({ description: 'GST Number' })
  @IsOptional() @IsString() @MaxLength(20)
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'CIN Number' })
  @IsOptional() @IsString() @MaxLength(25)
  cinNumber?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class CompanyQueryDto {
  @ApiPropertyOptional({ description: 'Filter by industry' })
  @IsOptional() @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @IsNumber() @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @IsNumber() @Type(() => Number)
  limit?: number = 20;
}
