import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { SupportService } from './support.service';
import { CreateTicketDto, AddTicketMessageDto, UpdateTicketDto, TicketQueryDto } from './dto';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
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
  async updateTicket(@Param('id') ticketId: string, @Body() dto: UpdateTicketDto) {
    return this.supportService.updateTicket(ticketId, dto);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to ticket (admin)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async addAdminMessage(
    @Param('id') ticketId: string,
    @Body() dto: AddTicketMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.supportService.addAdminMessage(userId, ticketId, dto);
  }
}

// Separate controller for user-facing support endpoints (to be used via API Gateway)
@ApiTags('user-support')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me/support')
export class UserSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  async createTicket(@CurrentUser('sub') userId: string, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my support tickets' })
  async myTickets(@CurrentUser('sub') userId: string) {
    return this.supportService.getUserTickets(userId);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get my ticket details' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async getMyTicket(@CurrentUser('sub') userId: string, @Param('id') ticketId: string) {
    return this.supportService.getUserTicket(userId, ticketId);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to my ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async addMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') ticketId: string,
    @Body() dto: AddTicketMessageDto,
  ) {
    return this.supportService.addUserMessage(userId, ticketId, dto);
  }
}
