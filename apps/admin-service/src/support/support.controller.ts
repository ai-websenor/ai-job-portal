import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto, AddTicketMessageDto, UpdateTicketDto, TicketQueryDto } from './dto';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Admin endpoints for managing all tickets
  @Get('tickets')
  @ApiOperation({ summary: 'List all support tickets (admin)' })
  async listTickets(@Query() query: TicketQueryDto) {
    return this.supportService.getAllTickets(query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details with messages (admin)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async getTicket(
    @Param('id') ticketId: string,
    @Query('includeInternal') includeInternal?: string,
  ) {
    return this.supportService.getTicketById(ticketId, includeInternal === 'true');
  }

  @Put('tickets/:id')
  @ApiOperation({ summary: 'Update ticket status/priority/assignment (admin)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async updateTicket(
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportService.updateTicket(ticketId, dto);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to ticket (admin)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async addAdminMessage(
    @Param('id') ticketId: string,
    @Body() dto: AddTicketMessageDto,
    // In production, get admin ID from JWT
  ) {
    // TODO: Get adminId from JWT token
    const adminId = 'admin-placeholder';
    return this.supportService.addAdminMessage(adminId, ticketId, dto);
  }
}

// Separate controller for user-facing support endpoints (to be used via API Gateway)
@ApiTags('user-support')
@ApiBearerAuth()
@Controller('users/me/support')
export class UserSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  async createTicket(@Body() dto: CreateTicketDto) {
    // TODO: Get userId from JWT token
    const userId = 'user-placeholder';
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my support tickets' })
  async myTickets() {
    // TODO: Get userId from JWT token
    const userId = 'user-placeholder';
    return this.supportService.getUserTickets(userId);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get my ticket details' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async getMyTicket(@Param('id') ticketId: string) {
    // TODO: Get userId from JWT token
    const userId = 'user-placeholder';
    return this.supportService.getUserTicket(userId, ticketId);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to my ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async addMessage(
    @Param('id') ticketId: string,
    @Body() dto: AddTicketMessageDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 'user-placeholder';
    return this.supportService.addUserMessage(userId, ticketId, dto);
  }
}
