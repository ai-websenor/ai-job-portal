import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCertificationDto {
  @ApiProperty({ description: 'Certification name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Issuing organization' })
  @IsString()
  issuingOrganization: string;

  @ApiProperty({ description: 'Issue date (YYYY-MM-DD)' })
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional({ description: 'Expiry date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Credential ID' })
  @IsOptional()
  @IsString()
  credentialId?: string;

  @ApiPropertyOptional({ description: 'Credential verification URL' })
  @IsOptional()
  @IsString()
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
  @ApiProperty() issueDate: string;
  @ApiPropertyOptional() expiryDate?: string;
  @ApiPropertyOptional() credentialId?: string;
  @ApiPropertyOptional() credentialUrl?: string;
  @ApiPropertyOptional() certificateFile?: string;
  @ApiProperty() isVerified: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
