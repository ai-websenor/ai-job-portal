'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import usePagination from '@/app/hooks/usePagination';
import { ISubscription } from '@/app/types/types';
import TableDate from '@/app/components/table/TableDate';
import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import CommonUtils from '@/app/utils/commonUtils';

const page = () => {
  const [loading, setLoading] = useState(false);
  const { page, setTotalPages, renderPagination } = usePagination();
  const [subscriptions, setSubscriptions] = useState<ISubscription[]>([]);

  const getHistory = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.SUBSCRIPTIONS.HISTORY, {
        params: { page, limit: 10 },
      });
      if (response?.data) {
        setSubscriptions(response?.data);
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
            <TableColumn>Plan</TableColumn>
            <TableColumn>Amount</TableColumn>
            <TableColumn>Billing Cycle</TableColumn>
            <TableColumn>Validity</TableColumn>
            <TableColumn>Purchased At</TableColumn>
            <TableColumn align="end">Status</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={loading}
            emptyContent={'No historical records found.'}
            loadingContent={<LoadingProgress />}
          >
            {subscriptions.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold">{(item?.plan as any)?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-400 capitalize">
                      {CommonUtils.keyIntoTitle(item?.billingCycle)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">
                    {item?.amount} {item?.currency}
                  </p>
                </TableCell>
                <TableCell className="capitalize">
                  {CommonUtils.keyIntoTitle(item?.billingCycle)}
                </TableCell>
                <TableCell>
                  <p className="text-sm">
                    {dayjs(item?.startDate).format('DD MMM YYYY')} -{' '}
                    {dayjs(item?.endDate).format('DD MMM YYYY')}
                  </p>
                </TableCell>
                <TableCell>
                  <TableDate date={item?.createdAt} />
                </TableCell>
                <TableCell align="right">
                  <Chip size="sm" variant="flat" color={item?.isActive ? 'success' : 'default'}>
                    {item?.isActive ? 'Active' : 'Expired'}
                  </Chip>
                </TableCell>
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
