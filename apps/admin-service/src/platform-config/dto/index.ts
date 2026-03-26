import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateInvoiceConfigDto {
  @ApiPropertyOptional({ description: 'Platform/company name on invoices' })
  @IsOptional()
  @IsString()
  platformName?: string;

  @ApiPropertyOptional({ description: 'Platform registered address' })
  @IsOptional()
  @IsString()
  platformAddress?: string;

  @ApiPropertyOptional({ description: 'Platform GST number (e.g. 27AXXXX1234Z1ZA)' })
  @IsOptional()
  @IsString()
  platformGstNumber?: string;

  @ApiPropertyOptional({ description: 'Platform state code for GST (e.g. 27 for Maharashtra)' })
  @IsOptional()
  @IsString()
  platformStateCode?: string;

  @ApiPropertyOptional({ description: 'Default HSN/SAC code for services (e.g. 998314)' })
  @IsOptional()
  @IsString()
  defaultHsnCode?: string;
}
