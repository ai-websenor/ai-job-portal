'use client';

import BackButton from '@/app/components/lib/BackButton';
import withAuth from '@/app/hoc/withAuth';
import { use, useEffect, useState } from 'react';
import InvoiceDetails from './InvoiceDetails';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { IInvoice } from '@/app/types/types';
import NoDataFound from '@/app/components/lib/NoDataFound';

const page = ({ params }: { params: Promise<{ transactionId: string }> }) => {
  const { transactionId } = use(params);
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<IInvoice | null>(null);

  const generateInvoice = async () => {
    try {
      setLoading(true);
      const res = await http.post(ENDPOINTS.INVOICES.GENERATE(transactionId), {});
      setInvoice(res?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInvoice();
  }, []);

  return (
    <>
      <title>{invoice?.invoiceNumber ?? 'Invoice'}</title>

      <div className="container mx-auto p-6 w-full space-y-5">
        <div className="flex flex-col gap-2">
          <BackButton showLabel />
          <h1 className="text-2xl font-bold text-foreground">
            Invoice: {invoice?.invoiceNumber ?? '--'}
          </h1>
        </div>

        {loading ? (
          <LoadingProgress />
        ) : invoice ? (
          <InvoiceDetails invoice={invoice} />
        ) : (
          <NoDataFound />
        )}
      </div>
    </>
  );
};

export default withAuth(page);
