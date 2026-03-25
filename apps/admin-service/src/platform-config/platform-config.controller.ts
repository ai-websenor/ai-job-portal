import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformConfigService } from './platform-config.service';
import { UpdateInvoiceConfigDto } from './dto';

@ApiTags('platform-config')
@ApiBearerAuth()
@Controller('platform-config')
export class PlatformConfigController {
  constructor(private readonly platformConfigService: PlatformConfigService) {}

  @Get('invoice')
  @ApiOperation({ summary: 'Get invoice platform config (GST, address, etc.)' })
  async getInvoiceConfig() {
    const data = await this.platformConfigService.getInvoiceConfig();
    return { message: 'Invoice config fetched successfully', data };
  }

  @Put('invoice')
  @ApiOperation({ summary: 'Update invoice platform config' })
  async updateInvoiceConfig(@Body() dto: UpdateInvoiceConfigDto) {
    const data = await this.platformConfigService.updateInvoiceConfig(dto);
    return { message: 'Invoice config updated successfully', data };
  }
}
