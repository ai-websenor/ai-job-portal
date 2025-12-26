import { IsString, IsOptional, IsBoolean, IsDate, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCertificationDto {
  @ApiProperty({
    example: 'AWS Certified Solutions Architect – Associate',
    description: 'Name of the certification',
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    example: 'Amazon Web Services (AWS)',
    description: 'Organization that issued the certification',
  })
  @IsString()
  @Length(1, 255)
  issuingOrganization: string;

  @ApiProperty({
    example: '2023-04-15T00:00:00.000Z',
    description: 'Date when the certification was issued',
  })
  @Type(() => Date)
  @IsDate()
  issueDate: Date;

  @ApiPropertyOptional({
    example: '2026-04-15T00:00:00.000Z',
    description: 'Certification expiry date (if applicable)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional({
    example: 'AWS-ASA-123456',
    description: 'Credential or certificate ID',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  credentialId?: string;

  @ApiPropertyOptional({
    example: 'https://www.credly.com/badges/example',
    description: 'Public URL to verify the certification',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  credentialUrl?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates whether the certification has been verified',
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
