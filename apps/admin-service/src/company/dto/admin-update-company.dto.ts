import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsUrl,
  MaxLength,
  Min,
  Max,
  IsEnum,
  IsBoolean,
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
 * DTO for admin users to update their own company profile
 * Restricted fields (cannot be edited by regular admins):
 * - panNumber, gstNumber, cinNumber (sensitive business registration numbers)
 * - logoUrl (use dedicated logo upload endpoint)
 * - verificationDocuments, kycDocuments (managed by super_admin only)
 * - isVerified, verificationStatus (managed by super_admin only)
 * - Cannot delete company
 */
export class AdminUpdateCompanyDto {
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

  // RESTRICTED FIELDS - Not allowed in this DTO
  // panNumber - Cannot be edited by regular admins
  // gstNumber - Cannot be edited by regular admins
  // cinNumber - Cannot be edited by regular admins
  // logoUrl - Use dedicated logo upload endpoint
  // verificationDocuments - Cannot be edited by regular admins
  // kycDocuments - Cannot be edited by regular admins
  // isVerified - Only super_admin can verify
  // verificationStatus - Only super_admin can change status
}

/**
 * Response DTO for admin company profile
 * Includes all company fields for admin's own company
 */
export class AdminCompanyProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  slug?: string;

  @ApiPropertyOptional()
  industry?: string;

  @ApiPropertyOptional()
  companySize?: string;

  @ApiPropertyOptional()
  companyType?: string;

  @ApiPropertyOptional()
  yearEstablished?: number;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  mission?: string;

  @ApiPropertyOptional()
  culture?: string;

  @ApiPropertyOptional()
  benefits?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  bannerUrl?: string;

  @ApiPropertyOptional()
  tagline?: string;

  @ApiPropertyOptional()
  headquarters?: string;

  @ApiPropertyOptional()
  employeeCount?: number;

  @ApiPropertyOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  twitterUrl?: string;

  @ApiPropertyOptional()
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'PAN Number (masked for security)' })
  panNumber?: string;

  @ApiPropertyOptional({ description: 'GST Number (masked for security)' })
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'CIN Number (masked for security)' })
  cinNumber?: string;

  @ApiPropertyOptional()
  verificationDocuments?: string;

  @ApiPropertyOptional()
  kycDocuments?: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  verificationStatus: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
