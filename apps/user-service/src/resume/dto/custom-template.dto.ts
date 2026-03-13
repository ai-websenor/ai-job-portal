import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ResumeStyleConfigDto } from './resume-style-config.dto';

export class GetTemplateDataDto {
  @ApiProperty({ description: 'ID of the resume template to fetch' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({ description: 'Optional styling overrides for preview rendering' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeStyleConfigDto)
  styleConfig?: ResumeStyleConfigDto;
}

export class GeneratePdfFromHtmlDto {
  @ApiProperty({ description: 'Final HTML content with user data already injected' })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({
    description:
      'Optional full HTML document (including <html>/<head>/<body>). If provided, PDF uses this exact markup.',
  })
  @IsOptional()
  @IsString()
  fullHtml?: string;

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

  @ApiPropertyOptional({ description: 'Dynamic styling overrides for PDF generation' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeStyleConfigDto)
  styleConfig?: ResumeStyleConfigDto;
}
