'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { use, useState } from 'react';
import TransactionDetails from './TransactionDetails';
import { Button } from '@heroui/react';
import { HiOutlineDocumentDownload } from 'react-icons/hi';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const page = ({ params }: { params: Promise<{ transactionId: string }> }) => {
  const { transactionId } = use(params);
  const [downloading, setDownloading] = useState(false);

  const downloadInvoice = async () => {
    try {
      setDownloading(true);
      await http.get(ENDPOINTS.INVOICES.DOWNLOAD(transactionId));
    } catch (error) {
      console.log(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <title>Transaction</title>
      <div className="container mx-auto p-6 w-full space-y-5">
        <div className="flex gap-3 items-center justify-between">
          <div className="flex flex-col gap-2">
            <BackButton showLabel />
            <h1 className="text-2xl font-bold text-foreground">Transaction Details</h1>
          </div>
          <Button
            color="primary"
            variant="flat"
            isLoading={downloading}
            onPress={downloadInvoice}
            startContent={<HiOutlineDocumentDownload size={20} />}
          >
            Download Invoice
          </Button>
        </div>

        <TransactionDetails />
      </div>
    </>
  );
};

export default withAuth(page);
