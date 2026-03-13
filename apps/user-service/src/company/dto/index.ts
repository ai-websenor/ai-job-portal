import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  IsUrl,
  MaxLength,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';

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

/**
 * DTO for super_employer to update their own company profile.
 * Restricted fields (cannot be edited by super_employer):
 * - panNumber, gstNumber, cinNumber (sensitive business registration numbers)
 * - logoUrl (use dedicated logo upload endpoint)
 * - verificationDocuments, kycDocuments (managed by super_admin only)
 * - isVerified, verificationStatus (managed by super_admin only)
 */
export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Industry sector' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size by employee count', enum: CompanySize })
  @IsOptional()
  @IsEnum(CompanySize)
  companySize?: CompanySize;

  @ApiPropertyOptional({ description: 'Company type', enum: CompanyType })
  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @ApiPropertyOptional({ description: 'Year established', minimum: 1800, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  yearEstablished?: number;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company mission statement' })
  @IsOptional()
  @IsString()
  mission?: string;

  @ApiPropertyOptional({ description: 'Company culture description' })
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiPropertyOptional({ description: 'Employee benefits' })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiPropertyOptional({ description: 'Company tagline', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Headquarters location' })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({ description: 'Total employee count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  employeeCount?: number;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: 'Twitter profile URL' })
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @ApiPropertyOptional({ description: 'Facebook page URL' })
  @IsOptional()
  @IsUrl()
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'Company banner URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

const ALLOWED_DOCUMENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class VerificationDocUploadUrlDto {
  @ApiProperty({
    description: 'Original filename of the document',
    example: 'pan-card.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the document',
    example: 'application/pdf',
    enum: ALLOWED_DOCUMENT_CONTENT_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_DOCUMENT_CONTENT_TYPES, {
    message:
      'contentType must be one of: image/jpeg, image/jpg, image/png, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  contentType: string;
}

export class VerificationDocConfirmDto {
  @ApiProperty({
    description: 'S3 key returned from the upload-url endpoint',
    example: 'company-gst-documents/1234567890-abc123.pdf',
  })
  @IsString()
  @IsNotEmpty()
  key: string;
}
