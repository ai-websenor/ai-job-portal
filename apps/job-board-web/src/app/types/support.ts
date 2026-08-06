export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ISupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface ITicketMessage {
  id: string;
  ticketId: string;
  senderType: 'user' | 'admin';
  message: string;
  attachments?: string[] | null;
  createdAt: string;
}

export interface ISupportTicketDetail extends ISupportTicket {
  messages: ITicketMessage[];
}
