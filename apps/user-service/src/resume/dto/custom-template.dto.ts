import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetTemplateDataDto {
  @ApiProperty({ description: 'ID of the resume template to fetch' })
  @IsString()
  @IsNotEmpty()
  templateId: string;
}

export class GeneratePdfFromHtmlDto {
  @ApiProperty({ description: 'Final HTML content with user data already injected' })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({ description: 'CSS styles to apply to the HTML' })
  @IsOptional()
  @IsString()
  css?: string;

  @ApiPropertyOptional({ description: 'Template ID (for record-keeping)' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Custom file name for the generated PDF' })
  @IsOptional()
  @IsString()
  fileName?: string;
}
