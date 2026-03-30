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

  @ApiPropertyOptional({ description: 'Year established (4-digit number)' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
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

  @ApiPropertyOptional({ description: 'Headquarters location', example: 'Mumbai, India' })
  @IsOptional()
  @IsString()
  headquarters?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'State', example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'State code (2-digit GST state code)', example: '27' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  stateCode?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Full street address',
    example: '123, MG Road, Fort',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'PIN / ZIP code', example: '400001' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ description: 'Billing email for invoices', example: 'billing@acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Billing phone number', example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  billingPhone?: string;

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

  @ApiPropertyOptional({ description: 'Instagram profile URL' })
  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

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
