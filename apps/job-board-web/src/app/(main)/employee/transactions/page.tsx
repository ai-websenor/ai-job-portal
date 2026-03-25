'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import TransactionsListTable from './TransactionsListTable';

const page = () => {
  return (
    <>
      <title>All Transactions</title>
      <div className="container mx-auto p-6 w-full space-y-5">
        <div className="flex flex-col gap-2">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">All Transactions</h1>
        </div>
        <TransactionsListTable />
      </div>
    </>
  );
};

export default withAuth(page);
