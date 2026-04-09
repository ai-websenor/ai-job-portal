import { Card, CardBody, CardHeader, Divider, Chip, Snippet, Button, Link } from '@heroui/react';
import {
  MdCheckCircle,
  MdOutlineAccessTime,
  MdOutlinePayment,
  MdOutlineReceiptLong,
  MdOutlineLocationOn,
  MdErrorOutline,
  MdHistory,
  MdInfoOutline,
} from 'react-icons/md';
import { BiCreditCard, BiHash, BiDetail } from 'react-icons/bi';
import dayjs from 'dayjs';
import CommonUtils from '@/app/utils/commonUtils';
import { ITransaction } from '@/app/types/types';
import { LiaFileInvoiceDollarSolid } from 'react-icons/lia';
import routePaths from '@/app/config/routePaths';
import { TransactionStatus } from '@/app/types/enum';

type Props = {
  transaction: ITransaction;
};

const TransactionDetails = ({ transaction }: Props) => {
  let metadata: any = {};
  try {
    metadata = JSON.parse(transaction.metadata || '{}');
  } catch (e) {
    metadata = {};
  }

  const renderStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <MdCheckCircle size={18} />;
      case 'pending':
        return <MdOutlineAccessTime size={18} />;
      case 'failed':
      case 'cancelled':
        return <MdErrorOutline size={18} />;
      default:
        return <MdInfoOutline size={18} />;
    }
  };

  return (
    <div>
      {transaction.status === TransactionStatus.success && (
        <div className="flex justify-end mb-2">
          <Button
            as={Link}
            href={routePaths.employee.transactions.invoiceDetails(transaction.id)}
            size="sm"
            startContent={<LiaFileInvoiceDollarSolid size={20} />}
            color="primary"
          >
            View Invoice
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Status & Amount Card */}
          <Card className="shadow-sm border-none bg-gradient-to-br from-white to-default-50 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <MdOutlinePayment size={120} />
            </div>
            <CardBody className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Chip
                      variant="flat"
                      startContent={renderStatusIcon(transaction.status)}
                      color={CommonUtils.getStatusColor(transaction.status)}
                      className="px-3"
                    >
                      {CommonUtils.keyIntoTitle(transaction.status)}
                    </Chip>
                    {transaction.paymentGateway && (
                      <Chip variant="dot" color="default" size="sm" className="border-none">
                        {transaction.paymentGateway.toUpperCase()}
                      </Chip>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-default-400 text-xs font-bold uppercase tracking-[0.2em]">
                      Transaction Amount
                    </p>
                    <h2 className="text-5xl font-black text-primary flex items-baseline gap-2">
                      <span className="text-2xl font-semibold opacity-70">
                        {transaction.currency}
                      </span>
                      {parseFloat(transaction.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </h2>
                  </div>
                </div>

                <div className="w-full md:w-auto bg-white/50 backdrop-blur-md rounded-3xl p-6 min-w-[240px] border border-default-200/50 shadow-inner">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <MdOutlinePayment size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-default-400 font-bold uppercase tracking-wider">
                        Method
                      </p>
                      <span className="font-bold text-foreground">
                        {transaction.paymentMethod
                          ? CommonUtils.keyIntoTitle(transaction.paymentMethod)
                          : 'Not set'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-default-200/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-default-500">Processing Date</span>
                      <span className="text-foreground font-bold">
                        {dayjs(transaction.createdAt).format('MMM D, YYYY')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-default-500">Reference Type</span>
                      <span className="text-foreground font-bold uppercase">
                        {metadata.type || 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none h-full">
              <CardHeader className="px-6 pt-6">
                <div className="flex items-center gap-2">
                  <BiCreditCard className="text-primary" size={20} />
                  <h3 className="font-bold">Payment Identifiers</h3>
                </div>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-2 space-y-4">
                <div className="bg-default-50 p-4 rounded-2xl space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-default-400 font-bold uppercase">
                        Internal ID
                      </span>
                    </div>
                    <Snippet
                      size="sm"
                      symbol=""
                      variant="flat"
                      className="w-full bg-white border border-default-200"
                    >
                      {transaction.id}
                    </Snippet>
                  </div>

                  {transaction.gatewayOrderId && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-default-400 font-bold uppercase">
                          Gateway Order ID
                        </span>
                      </div>
                      <Snippet
                        size="sm"
                        symbol=""
                        variant="flat"
                        className="w-full bg-white border border-default-200"
                      >
                        {transaction.gatewayOrderId}
                      </Snippet>
                    </div>
                  )}

                  {transaction.gatewayPaymentId && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-default-400 font-bold uppercase">
                          Gateway Payment ID
                        </span>
                      </div>
                      <Snippet
                        size="sm"
                        symbol=""
                        variant="flat"
                        className="w-full bg-white border border-default-200"
                      >
                        {transaction.gatewayPaymentId}
                      </Snippet>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card className="shadow-sm border-none h-full">
              <CardHeader className="px-6 pt-6">
                <div className="flex items-center gap-2">
                  <MdOutlineLocationOn className="text-primary" size={20} />
                  <h3 className="font-bold">Billing Context</h3>
                </div>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-2">
                <div className="bg-default-50 p-5 rounded-2xl h-full flex flex-col justify-center min-h-[160px]">
                  {transaction.billingAddress ? (
                    <p className="text-sm text-default-600 leading-relaxed italic">
                      {transaction.billingAddress}
                    </p>
                  ) : (
                    <div className="text-center space-y-2 opacity-40">
                      <MdOutlineLocationOn size={32} className="mx-auto" />
                      <p className="text-xs font-medium">No billing address provided</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Breakdown Card */}
          <Card className="shadow-sm border-none">
            <CardHeader className="px-6 pt-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MdOutlineReceiptLong className="text-primary" size={22} />
                <h3 className="font-bold text-lg">Order Summary</h3>
              </div>
            </CardHeader>
            <CardBody className="px-8 pb-8">
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-default-500 font-medium lowercase">
                      Item/Subscription
                    </span>
                    <span className="text-xs text-default-400 uppercase font-bold">
                      {metadata.planId || 'Standard Service'}
                    </span>
                  </div>
                  <span className="font-bold">
                    {transaction.currency} {parseFloat(transaction.amount).toFixed(2)}
                  </span>
                </div>

                {parseFloat(transaction.discountAmount) > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-default-500">Discount</span>
                      {transaction.discountCodeId && (
                        <Chip
                          size="sm"
                          color="success"
                          variant="flat"
                          className="h-5 px-1 text-[10px]"
                        >
                          {transaction.discountCodeId}
                        </Chip>
                      )}
                    </div>
                    <span className="text-success font-bold">
                      -{transaction.currency} {parseFloat(transaction.discountAmount).toFixed(2)}
                    </span>
                  </div>
                )}

                {parseFloat(transaction.taxAmount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-default-500">Estimated Tax</span>
                    <span className="font-bold">
                      {transaction.currency} {parseFloat(transaction.taxAmount).toFixed(2)}
                    </span>
                  </div>
                )}

                <Divider className="my-2" />

                <div className="flex justify-between items-center pt-2">
                  <div>
                    <span className="text-xl font-black uppercase">Grand Total</span>
                    <p className="text-[10px] text-default-400 font-bold uppercase tracking-widest leading-none mt-1">
                      Inclusive of all taxes
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary">
                      {transaction.currency} {parseFloat(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-none bg-default-50/50">
            <CardBody className="p-6 space-y-6">
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-default-200">
                  <BiDetail className="text-primary" size={20} />
                  <p className="text-xs font-black text-default-700 uppercase tracking-widest">
                    Process Metadata
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-default-500">
                      <MdOutlineAccessTime size={18} />
                      <span>Updated</span>
                    </div>
                    <span className="font-bold">
                      {dayjs(transaction.updatedAt).format('MMM D, h:mm A')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-default-500">
                      <BiHash size={18} />
                      <span>Invoice #</span>
                    </div>
                    <span className="font-mono font-bold text-xs">
                      {transaction.invoiceNumber || 'Not Generated'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-default-500">
                      <MdHistory size={18} />
                      <span>Attempts</span>
                    </div>
                    <Chip size="sm" variant="flat" className="font-bold">
                      {transaction.retryCount}
                    </Chip>
                  </div>

                  {transaction.emiTenure && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-default-500">
                        <MdOutlinePayment size={18} />
                        <span>EMI Tenure</span>
                      </div>
                      <span className="font-bold">{transaction.emiTenure} Months</span>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Dynamic Metadata Section */}
          {Object.keys(metadata).length > 0 && (
            <Card className="shadow-sm border-none">
              <CardHeader className="px-6 pt-4 pb-0">
                <p className="text-[10px] font-black text-default-400 uppercase tracking-tighter">
                  Session Info
                </p>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-2 gap-3">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 border-l-2 border-primary/20 pl-3">
                    <span className="text-[10px] font-bold text-default-500 uppercase">{key}</span>
                    <span className="text-xs font-mono break-all">{String(value)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Refund Info (Conditional) */}
          {(parseFloat(transaction.refundAmount) > 0 || transaction.refundedAt) && (
            <Card className="shadow-sm border-none bg-danger-50 text-danger-700 border-l-4 border-danger">
              <CardBody className="p-4 items-center gap-4 flex-row">
                <div className="p-2.5 bg-danger-100 rounded-2xl text-danger shadow-sm">
                  <BiCreditCard size={22} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black uppercase tracking-tight">Refund Processed</h4>
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs font-medium opacity-80">
                      {transaction.refundedAt
                        ? dayjs(transaction.refundedAt).format('MMM D, YYYY')
                        : 'Recently'}
                    </p>
                    <p className="text-sm font-black">
                      {transaction.currency} {parseFloat(transaction.refundAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* User Info tracking */}
          <div className="p-5 bg-default-100/50 rounded-3xl border border-default-200/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-default-400 uppercase">
                Tracking Hub
              </span>
              <Chip size="sm" variant="dot" color="primary" className="border-none h-4 px-0">
                Active Session
              </Chip>
            </div>
            <p className="text-xs font-bold text-default-500 pb-1">User ID Reference</p>
            <Snippet size="sm" symbol="" variant="flat" className="w-full bg-white/50 p-2">
              {transaction.userId}
            </Snippet>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
