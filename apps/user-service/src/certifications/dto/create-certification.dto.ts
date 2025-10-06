import { IsString, IsOptional, IsBoolean, IsDate, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCertificationDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  issuingOrganization: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  issueDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  credentialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  credentialUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
