import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { Database, supportTickets, ticketMessages, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateTicketDto, AddTicketMessageDto, UpdateTicketDto, TicketQueryDto } from './dto';

@Injectable()
export class SupportService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `TKT-${year}-${random}`;
  }

  // User-facing endpoints
  async createTicket(userId: string, dto: CreateTicketDto) {
    const [ticket] = await this.db.insert(supportTickets).values({
      ticketNumber: this.generateTicketNumber(),
      userId,
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority || 'medium',
      status: 'open',
    }).returning();

    // Add initial message
    await this.db.insert(ticketMessages).values({
      ticketId: ticket.id,
      senderType: 'user' as const,
      senderId: userId,
      message: dto.message,
      isInternalNote: false,
    });

    return ticket;
  }

  async getUserTickets(userId: string) {
    return this.db.query.supportTickets.findMany({
      where: eq(supportTickets.userId, userId),
      orderBy: [desc(supportTickets.createdAt)],
    });
  }

  async getUserTicket(userId: string, ticketId: string) {
    const ticket = await this.db.query.supportTickets.findFirst({
      where: and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, userId),
      ),
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const messages = await this.db.query.ticketMessages.findMany({
      where: and(
        eq(ticketMessages.ticketId, ticketId),
        eq(ticketMessages.isInternalNote, false),
      ),
      orderBy: [desc(ticketMessages.createdAt)],
    });

    return { ...ticket, messages };
  }

  async addUserMessage(userId: string, ticketId: string, dto: AddTicketMessageDto) {
    const ticket = await this.db.query.supportTickets.findFirst({
      where: and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, userId),
      ),
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const [message] = await this.db.insert(ticketMessages).values({
      ticketId,
      senderType: 'user' as const,
      senderId: userId,
      message: dto.message,
      isInternalNote: false,
    }).returning();

    // Update ticket status if it was resolved (reopening)
    if (ticket.status === 'resolved') {
      await this.db.update(supportTickets)
        .set({ status: 'in_progress' as const, updatedAt: new Date() })
        .where(eq(supportTickets.id, ticketId));
    }

    return message;
  }

  // Admin endpoints
  async getAllTickets(query: TicketQueryDto) {
    const conditions = [];
    if (query.status) conditions.push(eq(supportTickets.status, query.status));
    if (query.priority) conditions.push(eq(supportTickets.priority, query.priority));
    if (query.category) conditions.push(eq(supportTickets.category, query.category));
    if (query.assignedTo) conditions.push(eq(supportTickets.assignedTo, query.assignedTo));

    const tickets = await this.db.query.supportTickets.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(supportTickets.createdAt)],
    });

    return tickets;
  }

  async getTicketById(ticketId: string, includeInternal = false) {
    const ticket = await this.db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, ticket.userId),
      columns: { id: true, email: true, firstName: true, lastName: true },
    });

    const messageConditions = [eq(ticketMessages.ticketId, ticketId)];
    if (!includeInternal) {
      messageConditions.push(eq(ticketMessages.isInternalNote, false));
    }

    const messages = await this.db.query.ticketMessages.findMany({
      where: and(...messageConditions),
      orderBy: [desc(ticketMessages.createdAt)],
    });

    return { ...ticket, user, messages };
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    const updateData: any = { ...dto, updatedAt: new Date() };

    if (dto.status === 'resolved' || dto.status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await this.db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    if (!updated) throw new NotFoundException('Ticket not found');

    return updated;
  }

  async addAdminMessage(adminId: string, ticketId: string, dto: AddTicketMessageDto) {
    const ticket = await this.db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const [message] = await this.db.insert(ticketMessages).values({
      ticketId,
      senderType: 'admin' as const,
      senderId: adminId,
      message: dto.message,
      isInternalNote: dto.isInternalNote || false,
    }).returning();

    // Update status to in_progress if open
    if (!dto.isInternalNote && ticket.status === 'open') {
      await this.db.update(supportTickets)
        .set({ status: 'in_progress' as const, updatedAt: new Date() })
        .where(eq(supportTickets.id, ticketId));
    }

    return message;
  }
}
