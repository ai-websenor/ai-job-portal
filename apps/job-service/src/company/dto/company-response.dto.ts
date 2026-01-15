import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ description: 'Company ID' })
  id: string;

  @ApiProperty({ description: 'Company name' })
  name: string;

  @ApiProperty({ description: 'Unique URL slug' })
  slug: string;

  @ApiPropertyOptional({ description: 'Industry' })
  industry?: string | null;

  @ApiPropertyOptional({
    description: 'Company type',
    enum: ['startup', 'sme', 'mnc', 'government'],
  })
  companyType?: string | null;

  @ApiPropertyOptional({
    description: 'Company size',
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
  })
  companySize?: string | null;

  @ApiPropertyOptional({ description: 'Year established' })
  yearEstablished?: number | null;

  @ApiPropertyOptional({ description: 'Company website URL' })
  website?: string | null;

  @ApiPropertyOptional({ description: 'Company description' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Company mission statement' })
  mission?: string | null;

  @ApiPropertyOptional({ description: 'Company culture description' })
  culture?: string | null;

  @ApiPropertyOptional({ description: 'Company benefits (JSON stringified)' })
  benefits?: string | null;

  @ApiPropertyOptional({ description: 'Logo URL' })
  logoUrl?: string | null;

  @ApiPropertyOptional({ description: 'Banner image URL' })
  bannerUrl?: string | null;

  @ApiPropertyOptional({ description: 'Company tagline' })
  tagline?: string | null;

  @ApiProperty({ description: 'Verification status' })
  isVerified: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
