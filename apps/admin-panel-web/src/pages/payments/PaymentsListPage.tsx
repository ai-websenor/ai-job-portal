/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Eye,
  IndianRupee,
  DollarSign,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IPayment } from '@/types';
import { format } from 'date-fns';

interface PaymentsResponse {
  data: IPayment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  success: { label: 'Success', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  refunded: { label: 'Refunded', variant: 'secondary', icon: RotateCcw },
};

const PaymentsListPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<IPayment | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, providerFilter, fromDate, toDate]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'payments',
      page,
      limit,
      debouncedSearch,
      statusFilter,
      providerFilter,
      fromDate,
      toDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (providerFilter !== 'all') params.set('provider', providerFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const response = await http.get(`${endpoints.payments.list}?${params}`);
      return response as unknown as PaymentsResponse;
    },
  });

  const payments = data?.data || [];
  const totalPayments = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  const successCount = payments.filter((p) => p.status === 'success').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const failedCount = payments.filter((p) => p.status === 'failed').length;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const formatAmount = (amount: string | number, currency: string) => {
    const num = Number(amount);
    const formatted = num.toLocaleString('en-IN');
    return `${currency} ${formatted}`;
  };

  const openDetailsDialog = (payment: IPayment) => {
    setSelectedPayment(payment);
    setDetailsDialogOpen(true);
  };

  const CurrencyIcon = ({ currency }: { currency: string }) => {
    if (currency === 'INR') return <IndianRupee className="h-4 w-4 text-muted-foreground" />;
    return <DollarSign className="h-4 w-4 text-muted-foreground" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">View and track all payment transactions</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user name, email, or transaction ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-4 md:flex-row mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="fromDate" className="whitespace-nowrap text-sm">
                From
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full md:w-[180px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="toDate" className="whitespace-nowrap text-sm">
                To
              </Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full md:w-[180px]"
              />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
              >
                Clear Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>A list of all payment transactions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading payments...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-destructive">Failed to load payments</div>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No payments found</h3>
              <p className="text-muted-foreground">No payments match your filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {payment.user
                              ? `${payment.user.firstName} ${payment.user.lastName}`
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payment.user?.email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CurrencyIcon currency={payment.currency} />
                          <span className="font-medium">
                            {formatAmount(payment.amount, payment.currency)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.paymentGateway}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {payment.metadata?.type ? (
                            <span className="capitalize">{payment.metadata.type}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(payment.createdAt)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailsDialog(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({totalPayments} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Complete payment transaction information</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <div className="font-medium">
                    {selectedPayment.user
                      ? `${selectedPayment.user.firstName} ${selectedPayment.user.lastName}`
                      : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedPayment.user?.email}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={selectedPayment.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <div className="text-xl font-bold">
                    {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Gateway</Label>
                  <div className="font-medium capitalize">{selectedPayment.paymentGateway}</div>
                </div>
              </div>

              {(selectedPayment.taxAmount && Number(selectedPayment.taxAmount) > 0) ||
              (selectedPayment.discountAmount && Number(selectedPayment.discountAmount) > 0) ? (
                <div className="grid grid-cols-2 gap-4">
                  {selectedPayment.taxAmount && Number(selectedPayment.taxAmount) > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Tax Amount</Label>
                      <div className="font-medium">
                        {formatAmount(selectedPayment.taxAmount, selectedPayment.currency)}
                      </div>
                    </div>
                  )}
                  {selectedPayment.discountAmount && Number(selectedPayment.discountAmount) > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Discount</Label>
                      <div className="font-medium text-green-600">
                        -{formatAmount(selectedPayment.discountAmount, selectedPayment.currency)}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="border-t pt-4">
                <Label className="text-muted-foreground mb-2 block">Transaction Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Gateway Order ID</Label>
                    <div className="text-sm font-mono break-all">
                      {selectedPayment.gatewayOrderId || '-'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Gateway Payment ID</Label>
                    <div className="text-sm font-mono break-all">
                      {selectedPayment.gatewayPaymentId || '-'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                    <div className="text-sm font-mono break-all">
                      {selectedPayment.transactionId || '-'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Method</Label>
                    <div className="text-sm capitalize">{selectedPayment.paymentMethod || '-'}</div>
                  </div>
                </div>
              </div>

              {selectedPayment.metadata && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-2 block">Metadata</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPayment.metadata.type && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <div className="text-sm capitalize">{selectedPayment.metadata.type}</div>
                      </div>
                    )}
                    {selectedPayment.metadata.planId && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Plan ID</Label>
                        <div className="text-sm font-mono break-all">
                          {selectedPayment.metadata.planId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.refundedAt && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-2 block">Refund Info</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Refund Amount</Label>
                      <div className="text-sm font-medium text-destructive">
                        {formatAmount(
                          selectedPayment.refundAmount || '0',
                          selectedPayment.currency,
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Refunded At</Label>
                      <div className="text-sm">{formatDate(selectedPayment.refundedAt)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Created At</Label>
                    <div className="text-sm">{formatDate(selectedPayment.createdAt)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Updated At</Label>
                    <div className="text-sm">
                      {selectedPayment.updatedAt ? formatDate(selectedPayment.updatedAt) : '-'}
                    </div>
                  </div>
                  {selectedPayment.retryCount !== undefined && selectedPayment.retryCount > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Retry Count</Label>
                      <div className="text-sm">{selectedPayment.retryCount}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsListPage;
