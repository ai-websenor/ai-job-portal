import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { ListInvoicesDto } from './dto';
import { CurrentUserId } from '../decorators/current-user-id.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List user invoices' })
  async listInvoices(@CurrentUserId() userId: string, @Query() dto: ListInvoicesDto) {
    return this.invoiceService.listInvoices(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiParam({ name: 'id', description: 'Invoice ID (UUID)' })
  async getInvoice(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.invoiceService.getInvoice(userId, id);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download invoice as PDF or HTML',
    description:
      'Returns a presigned S3 download URL (valid 1 hour) if PDF exists, otherwise returns inline HTML.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID (UUID)' })
  async downloadInvoice(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.invoiceService.downloadInvoice(userId, id);
  }

  @Post('generate/:paymentId')
  @ApiOperation({
    summary: 'Generate invoice for a payment (manual trigger)',
    description:
      'Generates an invoice for a successful payment. Idempotent — returns existing invoice if already generated. User must own the payment.',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID (UUID)' })
  async generateInvoice(@CurrentUserId() userId: string, @Param('paymentId') paymentId: string) {
    return this.invoiceService.generateInvoice(paymentId, userId);
  }
}
