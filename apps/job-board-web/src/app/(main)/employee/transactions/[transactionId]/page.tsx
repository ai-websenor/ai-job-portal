'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { use, useEffect, useState } from 'react';
import TransactionDetails from './TransactionDetails';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { ITransaction } from '@/app/types/types';
import NoDataFound from '@/app/components/lib/NoDataFound';

const page = ({ params }: { params: Promise<{ transactionId: string }> }) => {
  const { transactionId } = use(params);
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<ITransaction | null>(null);

  const fetchTransaction = async () => {
    setLoading(true);
    try {
      const response = await http.get(ENDPOINTS.TRANSACTIONS.DETAILS(transactionId));
      if (response.data) {
        setTransaction(response.data);
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, []);

  return (
    <>
      <title>Transaction</title>
      <div className="container mx-auto p-6 w-full space-y-5">
        <div className="flex flex-col gap-2">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Transaction Details</h1>
        </div>

        {loading ? (
          <LoadingProgress />
        ) : transaction ? (
          <TransactionDetails transaction={transaction} />
        ) : (
          <NoDataFound />
        )}
      </div>
    </>
  );
};

export default withAuth(page);
