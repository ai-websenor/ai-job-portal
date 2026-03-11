'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { ISubscription } from '@/app/types/types';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { useEffect, useState } from 'react';

const page = () => {
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [subscription, setSubscription] = useState<ISubscription[]>([]);

  const getHistory = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.SUBSCRIPTIONS.HISTORY, {
        params: { page, limit: 10 },
      });
      if (response?.data) {
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getHistory();
  }, [page]);

  return (
    <>
      <title>Subscription History</title>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <BackButton showLabel />
        <h1 className="text-2xl font-bold mt-1 mb-6">Subscription History</h1>

        <Table shadow="none" className="mt-3">
          <TableHeader>
            <TableColumn></TableColumn>
          </TableHeader>
          <TableBody
            isLoading={loading}
            emptyContent={'No rows to display.'}
            loadingContent={<LoadingProgress />}
          >
            {subscription.map((item, index) => (
              <TableRow key={index}>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {renderPagination()}
      </div>
    </>
  );
};

export default withAuth(page);
