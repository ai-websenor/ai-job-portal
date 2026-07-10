'use client';

import { useEffect, useState, use } from 'react';
import { Button, Textarea, Card, CardBody, Divider } from '@heroui/react';
import { getTicket, addMessage } from '@/app/api/support';
import { ISupportTicketDetail } from '@/app/types/support';
import TicketMessages from '@/app/components/help-center/TicketMessages';
import BackButton from '@/app/components/lib/BackButton';
import CommonUtils from '@/app/utils/commonUtils';
import { FiCalendar } from 'react-icons/fi';

const TicketDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [ticket, setTicket] = useState<ISupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const data = await getTicket(id);
      setTicket(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;

    try {
      setIsReplying(true);
      await addMessage(id, { message: replyText.trim() });

      // Clear input and refetch to get updated thread and possible status change (e.g. resolved -> in_progress)
      setReplyText('');
      await fetchTicketDetails();
    } catch (error) {
      console.error(error);
    } finally {
      setIsReplying(false);
    }
  };

  if (loading && !ticket) {
    return <div className="p-6 text-center">Loading ticket details...</div>;
  }

  if (!ticket) {
    return <div className="p-6 text-center text-red-500">Ticket not found</div>;
  }

  const isClosed = ticket.status === 'closed';

  return (
    <div className="p-6 max-w-[1200px] w-full mx-auto space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Top Header */}
        <div className="h-1 w-full bg-primary" />

        <div className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left */}
            <div className="flex items-start gap-4">
              {/* Back Button */}
              <div className="mt-1 shrink-0">
                <BackButton />
              </div>

              {/* Ticket Info */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    {ticket.subject}
                  </h1>

                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                    #{ticket.ticketNumber}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  Support Ticket Details
                </p>

                {/* Meta Information */}

              </div>
            </div>

            {/* Right Side (Optional) */}
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                  <FiCalendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                      Created
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      {CommonUtils.formatChatListDate(ticket.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <h3 className="font-semibold text-gray-800">Conversation</h3>
        </div>
        <CardBody className="p-0">
          <div className="p-6 h-[500px] overflow-y-auto bg-slate-50">
            <TicketMessages messages={ticket.messages} />
          </div>

          <Divider />

          <div className="p-5 bg-white">
            {isClosed ? (
              <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                This ticket has been closed. You cannot reply to a closed ticket.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Textarea
                  placeholder="Type your reply here..."
                  variant="bordered"
                  radius="md"
                  minRows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  classNames={{
                    inputWrapper: "bg-white border-gray-200 hover:border-primary",
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    onPress={handleReplySubmit}
                    isLoading={isReplying}
                    isDisabled={!replyText.trim()}
                  >
                    Send Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TicketDetailPage;
