import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for updating company profile
 *
 * ALLOWED FIELDS (can be updated):
 * - description, website, logoUrl, bannerUrl, tagline
 * - industry, companySize, yearEstablished
 * - mission, culture, benefits
 *
 * READ-ONLY FIELDS (cannot be updated via this endpoint):
 * - name: Company name is set during registration and cannot be changed
 * - slug: URL slug is derived from name and must remain stable
 * - companyType: Company type (startup/sme/mnc/government) is fixed at creation
 * - isVerified: Managed by admin verification process
 * - verificationStatus: Managed by admin verification process
 * - verificationDocuments: Managed by admin verification process
 *
 * VALIDATION NOTES:
 * - website, logoUrl, bannerUrl must be valid URLs (include http:// or https://)
 * - companySize must be one of: '1-10', '11-50', '51-200', '201-500', '500+'
 * - yearEstablished must be between 1800 and current year
 *
 * If you need to update read-only fields, please contact support.
 */
export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Banner image URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Company tagline' })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company size',
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
  })
  @IsOptional()
  @IsEnum(['1-10', '11-50', '51-200', '201-500', '500+'])
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';

  @ApiPropertyOptional({ description: 'Year established' })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  yearEstablished?: number;

  @ApiPropertyOptional({ description: 'Company mission statement' })
  @IsOptional()
  @IsString()
  mission?: string;

  @ApiPropertyOptional({ description: 'Company culture description' })
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiPropertyOptional({ description: 'Company benefits (JSON stringified)' })
  @IsOptional()
  @IsString()
  benefits?: string;
}
