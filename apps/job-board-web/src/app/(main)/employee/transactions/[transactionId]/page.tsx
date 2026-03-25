'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { use } from 'react';
import TransactionDetails from './TransactionDetails';

const page = ({ params }: { params: Promise<{ transactionId: string }> }) => {
  const { transactionId } = use(params);

  return (
    <>
      <title>Transaction</title>
      <div className="container mx-auto p-6 w-full space-y-5">
        <div className="flex flex-col gap-2">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">Transaction Details</h1>
        </div>

        <TransactionDetails />
      </div>
    </>
  );
};

export default withAuth(page);
