import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvoiceManagementService } from './invoice-management.service';
import { ListInvoicesDto } from './dto';

@ApiTags('admin-invoices')
@ApiBearerAuth()
@Controller('admin/invoices')
export class InvoiceManagementController {
  constructor(private readonly invoiceManagementService: InvoiceManagementService) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices (admin) with search, filters, pagination' })
  async listInvoices(@Query() dto: ListInvoicesDto) {
    return this.invoiceManagementService.listInvoices(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details (admin)' })
  @ApiParam({ name: 'id', description: 'Invoice ID (UUID)' })
  async getInvoice(@Param('id') id: string) {
    return this.invoiceManagementService.getInvoice(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL for invoice PDF' })
  @ApiParam({ name: 'id', description: 'Invoice ID (UUID)' })
  async getDownloadUrl(@Param('id') id: string) {
    return this.invoiceManagementService.getDownloadUrl(id);
  }

  @Post(':id/resend-email')
  @ApiOperation({ summary: 'Resend invoice email to user' })
  @ApiParam({ name: 'id', description: 'Invoice ID (UUID)' })
  async resendInvoiceEmail(@Param('id') id: string) {
    return this.invoiceManagementService.resendInvoiceEmail(id);
  }
}
