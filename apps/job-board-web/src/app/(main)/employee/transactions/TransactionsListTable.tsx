'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import APP_CONFIG from '@/app/config/config';
import usePagination from '@/app/hooks/usePagination';
import { ITransaction } from '@/app/types/types';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { useEffect, useState } from 'react';

const TransactionsListTable = () => {
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [transactions, setTransactions] = useState<ITransaction[]>([]);

  const getTransactions = async () => {
    try {
      setLoading(true);
      const res: any = await http.get(ENDPOINTS.SUBSCRIPTIONS.TRANSACTIONS, {
        params: {
          page,
          limit: 10,
        },
      });
      console.log(res);
      setTotalPages(res?.pagination?.pageCount);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTransactions();
  }, [page]);

  return (
    <>
      <Table shadow="none">
        <TableHeader>
          <TableColumn>Transaction Id</TableColumn>
          <TableColumn>Invoice Number</TableColumn>
          <TableColumn>Payment Method</TableColumn>
          <TableColumn>Amount</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Created At</TableColumn>
          <TableColumn align="end">Actions</TableColumn>
        </TableHeader>

        <TableBody
          isLoading={loading}
          emptyContent={'No rows to display.'}
          loadingContent={<LoadingProgress />}
        >
          {transactions?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.transactionId}</TableCell>
              <TableCell>{item.invoiceNumber}</TableCell>
              <TableCell>{item.paymentMethod}</TableCell>
              <TableCell>
                {APP_CONFIG.CURRENCY}
                {item.amount}
              </TableCell>
              <TableCell>
                <TableStatus status={item.status} />
              </TableCell>
              <TableCell>
                <TableDate date={item.createdAt} />
              </TableCell>
              <TableCell align="right" className="flex justify-end items-center gap-2">
                <Button color="primary" size="sm" variant="flat">
                  View Details
                </Button>
                <Button color="success" size="sm" variant="flat">
                  Download Invoice
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {renderPagination()}
    </>
  );
};

export default TransactionsListTable;
