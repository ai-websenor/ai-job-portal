/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Headphones,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Flame,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'user' | 'admin';
  senderId: string;
  message: string;
  attachments: string[] | null;
  isInternalNote: boolean;
  createdAt: string;
}

interface TicketDetail extends SupportTicket {
  user: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  messages: TicketMessage[];
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: any;
  }
> = {
  open: {
    label: 'Open',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: AlertCircle,
  },
  in_progress: {
    label: 'In Progress',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    variant: 'default',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
    icon: XCircle,
  },
};

const priorityConfig: Record<string, { label: string; className: string; icon: any }> = {
  low: { label: 'Low', className: 'text-gray-500', icon: ArrowDown },
  medium: { label: 'Medium', className: 'text-blue-500', icon: ArrowRight },
  high: { label: 'High', className: 'text-orange-500', icon: ArrowUp },
  urgent: { label: 'Urgent', className: 'text-red-600', icon: Flame },
};

const categoryLabels: Record<string, string> = {
  technical: 'Technical Issue',
  bug: 'Bug Report',
  account: 'Account Problem',
  payment: 'Payment Issue',
};

export default function CustomerSupportPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const limit = 20;

  // Fetch tickets list
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['support-tickets', page, statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter && priorityFilter !== 'all') params.set('priority', priorityFilter);
      return http.get(`${endpoints.supportTickets.list}?${params.toString()}`);
    },
  });

  const ticketsData = responseData as any;
  const tickets: SupportTicket[] = ticketsData?.data || [];
  const pagination = ticketsData?.pagination || {};

  // Fetch ticket details
  const { data: ticketDetailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['support-ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      return http.get(`${endpoints.supportTickets.details(selectedTicketId)}?includeInternal=true`);
    },
    enabled: !!selectedTicketId && detailsOpen,
  });

  const ticketDetail = ticketDetailData as unknown as TicketDetail | null;

  // Update ticket mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; status?: string; priority?: string }) =>
      http.put(endpoints.supportTickets.update(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket-detail', selectedTicketId] });
      toast.success('Ticket updated');
    },
  });

  // Add message mutation
  const messageMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      message: string;
      isInternalNote?: boolean;
    }) => http.post(endpoints.supportTickets.addMessage(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-detail', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
      setReplyMessage('');
      setIsInternalNote(false);
    },
  });

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicketId(ticket.id);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setDetailsOpen(true);
  };

  const handleSendReply = () => {
    if (!selectedTicketId || !replyMessage.trim()) return;
    messageMutation.mutate({
      id: selectedTicketId,
      message: replyMessage.trim(),
      isInternalNote,
    });
  };

  const handleUpdateTicket = () => {
    if (!selectedTicketId) return;
    const payload: any = {};
    if (editStatus !== ticketDetail?.status) payload.status = editStatus;
    if (editPriority !== ticketDetail?.priority) payload.priority = editPriority;
    if (Object.keys(payload).length === 0) return;
    updateMutation.mutate({ id: selectedTicketId, ...payload });
  };

  const totalCount = pagination.totalTicket || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Headphones className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Support</h1>
          <p className="text-muted-foreground">Manage support tickets from users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tickets</CardDescription>
            <CardTitle className="text-2xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Open
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {tickets.filter((t) => t.status === 'open').length || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> In Progress
            </CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {tickets.filter((t) => t.status === 'in_progress').length || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {tickets.filter((t) => t.status === 'resolved').length || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={priorityFilter}
                onValueChange={(val) => {
                  setPriorityFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Headphones className="h-10 w-10 mb-2" />
              <p>No support tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => {
                  const sConfig = statusConfig[ticket.status] || statusConfig.open;
                  const pConfig = priorityConfig[ticket.priority] || priorityConfig.medium;
                  const PriorityIcon = pConfig.icon;
                  return (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openTicketDetail(ticket)}
                    >
                      <TableCell className="font-mono text-sm">{ticket.ticketNumber}</TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        {ticket.category ? categoryLabels[ticket.category] || ticket.category : '-'}
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${pConfig.className}`}>
                          <PriorityIcon className="h-3.5 w-3.5" />
                          <span className="text-sm">{pConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sConfig.variant} className={sConfig.className}>
                          {sConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.pageCount} ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Ticket {ticketDetail?.ticketNumber || ''}
            </DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : ticketDetail ? (
            <div className="space-y-5">
              {/* Ticket info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Subject</Label>
                  <p className="font-medium">{ticketDetail.subject}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">User</Label>
                  <p className="font-medium">
                    {ticketDetail.user
                      ? `${ticketDetail.user.firstName || ''} ${ticketDetail.user.lastName || ''}`.trim() ||
                        ticketDetail.user.email
                      : 'Unknown'}
                  </p>
                  {ticketDetail.user?.email && (
                    <p className="text-xs text-muted-foreground">{ticketDetail.user.email}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <p className="text-sm">
                    {ticketDetail.category
                      ? categoryLabels[ticketDetail.category] || ticketDetail.category
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created</Label>
                  <p className="text-sm">
                    {new Date(ticketDetail.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Status + Priority controls */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={handleUpdateTicket}
                    disabled={
                      updateMutation.isPending ||
                      (editStatus === ticketDetail.status && editPriority === ticketDetail.priority)
                    }
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Update'
                    )}
                  </Button>
                </div>
              </div>

              {/* Messages thread */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Conversation</Label>
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {ticketDetail.messages.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">No messages yet</p>
                  ) : (
                    <div className="divide-y">
                      {[...ticketDetail.messages].reverse().map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 ${
                            msg.isInternalNote
                              ? 'bg-amber-50 border-l-2 border-amber-400'
                              : msg.senderType === 'admin'
                                ? 'bg-blue-50/50'
                                : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">
                              {msg.isInternalNote
                                ? 'Internal Note'
                                : msg.senderType === 'admin'
                                  ? 'Admin'
                                  : 'User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          {msg.attachments &&
                            Array.isArray(msg.attachments) &&
                            msg.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {msg.attachments.map((url: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    Attachment {idx + 1}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reply box */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-medium">Reply</Label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Internal note
                  </label>
                </div>
                <Textarea
                  placeholder={
                    isInternalNote
                      ? 'Add an internal note (not visible to user)...'
                      : 'Type your reply to the user...'
                  }
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendReply}
                    disabled={messageMutation.isPending || !replyMessage.trim()}
                  >
                    {messageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isInternalNote ? 'Add Note' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
