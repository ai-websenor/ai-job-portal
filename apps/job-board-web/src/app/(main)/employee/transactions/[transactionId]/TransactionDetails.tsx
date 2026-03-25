import { Card, CardBody, CardHeader, Divider, Chip, Snippet, Link } from '@heroui/react';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import {
  MdCheckCircle,
  MdOutlineAccessTime,
  MdOutlinePayment,
  MdOutlineReceiptLong,
  MdOutlineLocationOn,
} from 'react-icons/md';
import { BiCreditCard, BiHash } from 'react-icons/bi';
import { transactionDetailsData } from '@/app/config/data';
import dayjs from 'dayjs';
import CommonUtils from '@/app/utils/commonUtils';

const TransactionDetails = () => {
  const data = transactionDetailsData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-sm border-none bg-gradient-to-br from-white to-default-50 dark:from-default-50 dark:to-content1">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-4">
                <Chip
                  variant="flat"
                  startContent={<MdCheckCircle size={16} />}
                  color={CommonUtils.getStatusColor(data.status)}
                >
                  {CommonUtils.keyIntoTitle(data.status)}
                </Chip>
                <div className="space-y-1">
                  <p className="text-default-400 text-sm font-medium uppercase tracking-wider">
                    Total Amount Paid
                  </p>
                  <h2 className="text-4xl font-bold text-primary flex items-baseline gap-1">
                    <span className="text-2xl font-medium">{data.currency}</span>
                    {data.amount}
                  </h2>
                </div>
              </div>

              <div className="w-full md:w-auto bg-default-100 rounded-2xl p-6 min-w-[200px] border border-default-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <MdOutlinePayment size={24} />
                  </div>
                  <span className="font-semibold">{data.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center text-default-500">
                    <span>Gateway:</span>
                    <span className="text-foreground font-medium uppercase">
                      {data.paymentGateway}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-default-500">
                    <span>Date:</span>
                    <span className="text-foreground font-medium">
                      {dayjs(data.createdAt).format('MMM D, YYYY')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Divider className="my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-default-700 font-semibold">
                  <BiCreditCard className="text-primary" size={20} />
                  <h3>Payment Source</h3>
                </div>
                <div className="bg-default-50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-default-500">Transaction ID</span>
                    <Snippet
                      size="sm"
                      symbol=""
                      variant="flat"
                      className="bg-transparent p-0 text-foreground font-medium"
                    >
                      {data.transactionId}
                    </Snippet>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-default-500">Gateway Ref</span>
                    <span className="text-sm font-mono truncate max-w-[150px]">
                      {data.gatewayPaymentId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-default-700 font-semibold">
                  <MdOutlineLocationOn className="text-primary" size={20} />
                  <h3>Billing Address</h3>
                </div>
                <div className="bg-default-50 p-4 rounded-xl">
                  <p className="text-sm text-default-600 leading-relaxed italic">
                    {data.billingAddress}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Breakdown Card */}
        <Card className="shadow-sm border-none">
          <CardHeader className="px-6 pt-6">
            <div className="flex items-center gap-2">
              <MdOutlineReceiptLong className="text-primary" size={22} />
              <h3 className="font-bold text-lg">Detailed Breakdown</h3>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-default-500">Subscription Amount</span>
                <span className="font-medium">
                  {data.currency} {data.amount}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <span className="text-default-500">Discount Applied</span>
                  {data.discountCodeId && (
                    <Chip size="sm" color="success" variant="dot" className="border-none">
                      {data.discountCodeId}
                    </Chip>
                  )}
                </div>
                <span className="text-success font-medium">
                  -{data.currency} {data.discountAmount}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-default-100 pb-4">
                <span className="text-default-500">Estimated Tax</span>
                <span className="font-medium">
                  {data.currency} {data.taxAmount}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-xl font-extrabold text-primary">
                  {data.currency} {data.amount}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm border-none">
          <CardBody className="p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-bold text-default-400 uppercase tracking-widest">
                General Information
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-default-500">
                    <MdOutlineAccessTime size={18} />
                    <span>Last Updated</span>
                  </div>
                  <span className="font-medium">
                    {dayjs(data.updatedAt).format('MMM D, h:mm A')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-default-500">
                    <BiHash size={18} />
                    <span>Invoice No.</span>
                  </div>
                  <span className="font-medium">{data.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-default-500">
                    <HiOutlineShieldCheck size={18} />
                    <span>Subscription ID</span>
                  </div>
                  <Link size="sm" isExternal href="#" className="font-mono">
                    {data.subscriptionId.split('_').pop()}
                  </Link>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Refund Info (Conditional) */}
        {(Number(data.refundAmount) > 0 || data.refundedAt) && (
          <Card className="shadow-sm border-none bg-danger-50 text-danger-600">
            <CardBody className="p-4 items-center gap-2 flex-row">
              <div className="p-2 bg-danger-100 rounded-full">
                <BiCreditCard size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Refund Processed</h4>
                <p className="text-xs">
                  {data.currency} {data.refundAmount} refunded
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* User Info (Mocked Label) */}
        <div className="p-4 bg-default-100 rounded-2xl flex items-center justify-between">
          <span className="text-xs font-semibold text-default-500">User Tracking ID</span>
          <span className="text-xs font-mono text-default-400">{data.userId}</span>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
