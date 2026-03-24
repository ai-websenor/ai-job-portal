/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Send,
  Eye,
  Loader2,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  userId: string;
  amount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  billingName: string | null;
  billingAddress: string | null;
  gstNumber: string | null;
  hsnCode: string | null;
  cgstAmount: string | null;
  sgstAmount: string | null;
  igstAmount: string | null;
  invoiceUrl: string | null;
  lineItems: any;
  notes: string | null;
  generatedAt: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  paymentStatus: string | null;
  paymentGateway: string | null;
  gatewayPaymentId: string | null;
  companyId: string | null;
  companyName: string | null;
}

interface InvoicesResponse {
  message: string;
  data: Invoice[];
  pagination: {
    totalInvoice: number;
    pageCount: number;
    currentPage: number;
    hasNextPage: boolean;
  };
}

const InvoicesListPage = () => {
  const _queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo]);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['admin-invoices', page, limit, debouncedSearch, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const response: any = await http.get(`${endpoints.adminInvoices.list}?${params.toString()}`);
      return response as InvoicesResponse;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await http.post(endpoints.adminInvoices.resendEmail(invoiceId), {});
    },
    onSuccess: () => {
      toast.success('Invoice email resent successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to resend email');
    },
  });

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination;

  const formatCurrency = (amount: string | null, currency: string) => {
    if (!amount) return '-';
    const symbol = currency === 'INR' ? '\u20B9' : '$';
    return `${symbol}${Number(amount).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
    } catch {
      return dateStr;
    }
  };

  const getUserName = (invoice: Invoice) => {
    const parts = [invoice.userFirstName, invoice.userLastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : invoice.billingName || '-';
  };

  const handleDownload = async (invoice: Invoice) => {
    if (!invoice.invoiceUrl) {
      toast.error('No PDF available for this invoice');
      return;
    }
    try {
      const response: any = await http.get(endpoints.adminInvoices.download(invoice.id));
      if (response?.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      } else {
        toast.error('Failed to get download URL');
      }
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">View and manage all generated invoices</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">{pagination?.totalInvoice || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Page</CardDescription>
            <CardTitle className="text-2xl">
              {pagination?.currentPage || 1} of {pagination?.pageCount || 1}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Showing</CardDescription>
            <CardTitle className="text-2xl">{invoices.length} invoices</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, name, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                placeholder="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                placeholder="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{getUserName(invoice)}</p>
                        <p className="text-xs text-muted-foreground">{invoice.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.companyName || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(invoice.taxAmount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.paymentStatus === 'success' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {invoice.paymentStatus || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invoice.generatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View details"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download PDF"
                          onClick={() => handleDownload(invoice)}
                          disabled={!invoice.invoiceUrl}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Resend email"
                          onClick={() => resendMutation.mutate(invoice.id)}
                          disabled={resendMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.totalInvoice)} of{' '}
            {pagination.totalInvoice}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>{selectedInvoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice Number</p>
                  <p className="font-mono font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{formatDate(selectedInvoice.generatedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment ID</p>
                  <p className="font-mono text-xs">{selectedInvoice.paymentId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gateway</p>
                  <p>{selectedInvoice.paymentGateway || '-'}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Bill To</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p>{selectedInvoice.billingName || getUserName(selectedInvoice)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{selectedInvoice.userEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p>{selectedInvoice.companyName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GST Number</p>
                    <p className="font-mono">{selectedInvoice.gstNumber || '-'}</p>
                  </div>
                  {selectedInvoice.billingAddress && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Address</p>
                      <p>{selectedInvoice.billingAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              {selectedInvoice.lineItems && Array.isArray(selectedInvoice.lineItems) && (
                <div className="border rounded-lg p-4">
                  <p className="font-medium mb-2">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.lineItems.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{item.description || '-'}</TableCell>
                          <TableCell className="text-center text-sm">
                            {item.quantity || 1}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(String(item.unitPrice || 0), selectedInvoice.currency)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(String(item.amount || 0), selectedInvoice.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Amounts */}
              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Amount Breakdown</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</span>
                  </div>
                  {selectedInvoice.cgstAmount && Number(selectedInvoice.cgstAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST</span>
                      <span>
                        {formatCurrency(selectedInvoice.cgstAmount, selectedInvoice.currency)}
                      </span>
                    </div>
                  )}
                  {selectedInvoice.sgstAmount && Number(selectedInvoice.sgstAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST</span>
                      <span>
                        {formatCurrency(selectedInvoice.sgstAmount, selectedInvoice.currency)}
                      </span>
                    </div>
                  )}
                  {selectedInvoice.igstAmount && Number(selectedInvoice.igstAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IGST</span>
                      <span>
                        {formatCurrency(selectedInvoice.igstAmount, selectedInvoice.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Total</span>
                    <span>
                      {formatCurrency(selectedInvoice.taxAmount, selectedInvoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1 mt-1">
                    <span>Total</span>
                    <span>
                      {formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="border rounded-lg p-4">
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedInvoice)}
                  disabled={!selectedInvoice.invoiceUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => resendMutation.mutate(selectedInvoice.id)}
                  disabled={resendMutation.isPending}
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Resend Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesListPage;
