import { IsString, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty() @IsUUID()
  applicationId: string;

  @ApiProperty() @IsNumber()
  salary: number;

  @ApiPropertyOptional({ default: 'INR' }) @IsOptional() @IsString()
  currency?: string;

  @ApiProperty() @IsDateString()
  joiningDate: string;

  @ApiProperty() @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  additionalBenefits?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  offerLetterUrl?: string;
}
