import { IInvoice } from '@/app/types/types';
import {
  Card,
  CardBody,
  Divider,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from '@heroui/react';
import { FiDownload, FiMapPin, FiPhone, FiGlobe } from 'react-icons/fi';
import { MdOutlineBusiness } from 'react-icons/md';
import dayjs from 'dayjs';
import { useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';

const InvoiceDetails = ({ invoice }: { invoice: IInvoice }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await http.get(ENDPOINTS.INVOICES.DOWNLOAD(invoice.id));
      if (res?.data?.downloadUrl && typeof window !== 'undefined') {
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-5">
        <Button
          isLoading={downloading}
          onPress={handleDownload}
          size="sm"
          color="primary"
          startContent={<FiDownload />}
        >
          Download PDF
        </Button>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden print:shadow-none print:border print:m-0 print:rounded-none">
        <CardBody className="p-0">
          <div className="h-2 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 w-full" />

          <div className="p-8 md:p-12 print:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg print:shadow-none">
                    <MdOutlineBusiness size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      AI JOB PORTAL
                    </h2>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                      Future of Hiring
                    </p>
                  </div>
                </div>
                <div className="text-sm text-default-500 space-y-1">
                  <p className="flex items-center gap-2">
                    <FiMapPin className="text-primary-400" />
                    123 Business Avenue, Tech Hub, NY 10001
                  </p>
                  <p className="flex items-center gap-2">
                    <FiPhone className="text-primary-400" />
                    +1 (555) 000-0000
                  </p>
                  <p className="flex items-center gap-2">
                    <FiGlobe className="text-primary-400" />
                    www.aijobportal.com
                  </p>
                </div>
              </div>

              <div className="text-right space-y-2">
                <h1 className="text-5xl font-black text-default-200 print:text-default-300">
                  INVOICE
                </h1>
                <div className="space-y-1">
                  <p className="text-default-500 font-bold text-sm tracking-wider uppercase">
                    Invoice Number
                  </p>
                  <p className="text-xl font-mono font-bold text-foreground">
                    {invoice.invoiceNumber}
                  </p>
                </div>
                <div className="inline-flex flex-col items-end">
                  <p className="text-default-500 font-bold text-[10px] uppercase tracking-widest">
                    Date Issued
                  </p>
                  <p className="font-bold">{dayjs(invoice.generatedAt).format('MMMM D, YYYY')}</p>
                </div>
              </div>
            </div>

            <Divider className="my-8 opacity-50" />

            {/* Client & Billing Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">
                  Billed To
                </p>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">{invoice.billingName}</h3>
                  <p className="text-default-600 leading-relaxed max-w-xs">
                    {invoice.billingAddress || 'Address not provided'}
                  </p>
                  {invoice.gstNumber && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-default-100 px-3 py-1 rounded-full print:bg-none print:border print:border-default-200">
                      <span className="text-[10px] font-bold text-default-500 uppercase">
                        GSTIN:
                      </span>
                      <span className="text-xs font-mono font-bold text-default-700">
                        {invoice.gstNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="md:text-right">
                <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">
                  Payment Details
                </p>
                <div className="space-y-3">
                  <div className="flex md:justify-end items-center gap-4">
                    <span className="text-sm text-default-500">Transaction ID:</span>
                    <span className="text-sm font-mono font-bold text-foreground">
                      {invoice.paymentId}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center gap-4">
                    <span className="text-sm text-default-500">Currency:</span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="primary"
                      className="font-bold print:bg-none print:border print:border-primary"
                    >
                      {invoice.currency}
                    </Chip>
                  </div>
                  {invoice.hsnCode && (
                    <div className="flex md:justify-end items-center gap-4">
                      <span className="text-sm text-default-500">HSN Code:</span>
                      <span className="text-sm font-bold">{invoice.hsnCode}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-12">
              <Table
                aria-label="Invoice line items"
                shadow="none"
                className="border border-default-100 rounded-2xl overflow-hidden print:rounded-none"
              >
                <TableHeader>
                  <TableColumn className="bg-default-50 text-default-500 font-bold uppercase text-[10px] print:bg-white print:border-b print:border-default-200">
                    Description
                  </TableColumn>
                  <TableColumn
                    className="bg-default-50 text-default-500 font-bold uppercase text-[10px] text-center print:bg-white print:border-b print:border-default-200"
                    width={100}
                  >
                    Qty
                  </TableColumn>
                  <TableColumn
                    className="bg-default-50 text-default-500 font-bold uppercase text-[10px] text-right print:bg-white print:border-b print:border-default-200"
                    width={150}
                  >
                    Unit Price
                  </TableColumn>
                  <TableColumn
                    className="bg-default-50 text-default-500 font-bold uppercase text-[10px] text-right print:bg-white print:border-b print:border-default-200"
                    width={150}
                  >
                    Total
                  </TableColumn>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems?.map((item, index) => (
                    <TableRow
                      key={index}
                      className="border-b border-default-50 last:border-none print:border-default-200"
                    >
                      <TableCell className="py-4">
                        <span className="font-bold text-foreground text-sm">
                          {item.description}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {invoice.currency} {parseFloat(item.unitPrice.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-foreground">
                          {invoice.currency} {parseFloat(item.total.toString()).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-8 pt-8 border-t border-default-100">
              <div className="flex-1">
                {invoice.notes && (
                  <div className="bg-default-50 p-6 rounded-2xl max-w-md print:bg-none print:border print:border-default-200">
                    <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-2">
                      Important Notes
                    </p>
                    <p className="text-xs text-default-600 leading-relaxed italic">
                      {invoice.notes}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-80 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-default-500 font-medium">Subtotal</span>
                  <span className="font-bold text-foreground">
                    {invoice.currency} {parseFloat(invoice.amount).toFixed(2)}
                  </span>
                </div>

                {parseFloat(invoice.cgstAmount) > 0 && (
                  <div className="flex justify-between items-center px-2">
                    <span className="text-default-400 text-sm">CGST</span>
                    <span className="text-sm font-medium">
                      {invoice.currency} {parseFloat(invoice.cgstAmount).toFixed(2)}
                    </span>
                  </div>
                )}

                {parseFloat(invoice.sgstAmount) > 0 && (
                  <div className="flex justify-between items-center px-2">
                    <span className="text-default-400 text-sm">SGST</span>
                    <span className="text-sm font-medium">
                      {invoice.currency} {parseFloat(invoice.sgstAmount).toFixed(2)}
                    </span>
                  </div>
                )}

                {parseFloat(invoice.igstAmount) > 0 && (
                  <div className="flex justify-between items-center px-2">
                    <span className="text-default-400 text-sm">IGST</span>
                    <span className="text-sm font-medium">
                      {invoice.currency} {parseFloat(invoice.igstAmount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center px-2">
                  <span className="text-default-500 font-medium">Total Tax</span>
                  <span className="font-bold">
                    {invoice.currency} {parseFloat(invoice.taxAmount).toFixed(2)}
                  </span>
                </div>

                <div className="p-4 bg-primary rounded-2xl flex justify-between items-center text-white shadow-xl shadow-primary/20 print:bg-none print:text-foreground print:border print:border-default-300 print:shadow-none">
                  <span className="font-black uppercase tracking-widest text-xs opacity-80">
                    Amount Due
                  </span>
                  <span className="text-2xl font-black">
                    {invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default InvoiceDetails;
