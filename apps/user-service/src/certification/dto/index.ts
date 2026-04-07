import { IsString, IsOptional, IsDateString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCertificationDto {
  @ApiProperty({ description: 'Certification name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Issuing organization' })
  @IsString()
  issuingOrganization: string;

  @ApiPropertyOptional({ description: 'Issue date (YYYY-MM-DD)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  issueDate?: string | null;

  @ApiPropertyOptional({ description: 'Expiry date (YYYY-MM-DD)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  expiryDate?: string | null;

  @ApiPropertyOptional({ description: 'Credential ID' })
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional({ description: 'Credential verification URL' })
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'credentialUrl must be a valid URL (e.g. https://example.com)' },
  )
  credentialUrl?: string;

  @ApiPropertyOptional({ description: 'Certificate file URL' })
  @IsOptional()
  @IsString()
  certificateFile?: string;
}

export class UpdateCertificationDto extends PartialType(CreateCertificationDto) {}

export class CertificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() profileId: string;
  @ApiProperty() name: string;
  @ApiProperty() issuingOrganization: string;
  @ApiPropertyOptional() issueDate?: string | null;
  @ApiPropertyOptional() expiryDate?: string | null;
  @ApiPropertyOptional() credentialId?: string;
  @ApiPropertyOptional() credentialUrl?: string;
  @ApiPropertyOptional() certificateFile?: string;
  @ApiProperty() isVerified: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
