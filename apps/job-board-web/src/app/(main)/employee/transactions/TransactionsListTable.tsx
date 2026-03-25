'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import TableDate from '@/app/components/table/TableDate';
import TableStatus from '@/app/components/table/TableStatus';
import APP_CONFIG from '@/app/config/config';
import routePaths from '@/app/config/routePaths';
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
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TransactionListFilters from './TransactionListFilters';

const TransactionsListTable = () => {
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [transactions, setTransactions] = useState<ITransaction[]>([]);

  const getTransactions = async (filters?: any) => {
    const params: any = {
      page,
      limit: 10,
    };

    for (const key in filters) {
      const value = filters[key];
      if (value) {
        params[key] = value;
      }
    }

    try {
      setLoading(true);
      const res: any = await http.get(ENDPOINTS.TRANSACTIONS.LIST, {
        params,
      });
      setTransactions(res?.data);
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
      <TransactionListFilters handleApply={getTransactions} />

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
              <TableCell>{item.transactionId ?? '--'}</TableCell>
              <TableCell>{item.invoiceNumber ?? '--'}</TableCell>
              <TableCell>{item.paymentMethod ?? '--'}</TableCell>
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
                <Button
                  as={Link}
                  href={routePaths.employee.transactions.detail(item.id)}
                  color="primary"
                  size="sm"
                  variant="flat"
                >
                  View Details
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
