import { Controller, Get, Param, Query, Headers, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { InvoiceService } from './invoice.service';
import { ListInvoicesDto } from './dto';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List user invoices' })
  async listInvoices(
    @Headers('x-user-id') userId: string,
    @Query() dto: ListInvoicesDto,
  ) {
    return this.invoiceService.listInvoices(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoice(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    return this.invoiceService.getInvoice(userId, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download invoice as HTML' })
  async downloadInvoice(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.invoiceService.downloadInvoice(userId, id);

    reply
      .header('Content-Type', 'text/html')
      .header('Content-Disposition', `attachment; filename="${result.invoiceNumber}.html"`)
      .send(result.html);
  }
}
