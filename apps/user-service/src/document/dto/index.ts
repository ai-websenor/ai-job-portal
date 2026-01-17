import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DocumentType {
  RESUME = 'resume',
  COVER_LETTER = 'cover_letter',
  CERTIFICATE = 'certificate',
  ID_PROOF = 'id_proof',
  PORTFOLIO = 'portfolio',
  OTHER = 'other',
}

export class UploadDocumentDto {
  @ApiProperty({ description: 'Document type', enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File path/URL' })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fileSize?: number;
}

export class DocumentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by document type', enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}

export class DocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() profileId: string;
  @ApiProperty() documentType: string;
  @ApiProperty() fileName: string;
  @ApiProperty() filePath: string;
  @ApiPropertyOptional() fileSize?: number;
  @ApiProperty() uploadedAt: Date;
}
