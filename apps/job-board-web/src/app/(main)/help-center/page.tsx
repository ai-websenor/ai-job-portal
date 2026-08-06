'use client';

import { useEffect, useState } from 'react';
import { Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { listTickets } from '@/app/api/support';
import { ISupportTicket } from '@/app/types/support';
import TableDate from '@/app/components/table/TableDate';
import SupportStatus from '@/app/components/help-center/SupportStatus';
import CreateTicketModal from '@/app/components/help-center/CreateTicketModal';
import NoDataFound from '@/app/components/lib/NoDataFound';
import { useRouter } from 'next/navigation';
import routePaths from '@/app/config/routePaths';

const HelpCenterPage = () => {
  const [tickets, setTickets] = useState<ISupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await listTickets();
      setTickets(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-gray-500 text-sm">Manage your support tickets and inquiries.</p>
        </div>
        <Button color="primary" onPress={() => setIsModalOpen(true)}>
          New Ticket
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <Table
          aria-label="Support Tickets"
          classNames={{
            wrapper: 'shadow-none p-0',
            th: 'bg-gray-50 text-gray-600 font-medium',
          }}
          selectionMode="single"
          onRowAction={(key) => router.push(routePaths.helpCenter.detail(key as string))}
        >
          <TableHeader>
            <TableColumn>TICKET NO.</TableColumn>
            <TableColumn>SUBJECT</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>PRIORITY</TableColumn>
            <TableColumn>CREATED AT</TableColumn>
          </TableHeader>
          <TableBody
            items={tickets}
            isLoading={loading}
            loadingContent={<div className="p-4">Loading tickets...</div>}
            emptyContent={!loading ? <NoDataFound message="No support tickets found" /> : null}
          >
            {(item) => (
              <TableRow key={item.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium text-gray-700">{item.ticketNumber}</TableCell>
                <TableCell className="max-w-[300px] truncate">{item.subject}</TableCell>
                <TableCell>
                  <SupportStatus status={item.status} type="status" />
                </TableCell>
                <TableCell>
                  <SupportStatus status={item.priority} type="priority" />
                </TableCell>
                <TableCell>
                  <TableDate date={item.createdAt} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTickets}
      />
    </div>
  );
};

export default HelpCenterPage;
