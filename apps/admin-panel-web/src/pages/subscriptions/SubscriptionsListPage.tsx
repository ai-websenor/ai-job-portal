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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Eye,
  Ban,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { ISubscription } from '@/types';
import { format } from 'date-fns';

interface SubscriptionsResponse {
  data: ISubscription[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const SubscriptionsListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'canceled'>(
    'all',
  );

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<ISubscription | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch subscriptions
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscriptions', page, limit, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await http.get(`${endpoints.subscriptions.active.list}?${params}`);
      return response as unknown as SubscriptionsResponse;
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await http.patch(endpoints.subscriptions.active.cancel(id), {
        reason,
        immediate: true,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription canceled successfully');
      setCancelDialogOpen(false);
      setSelectedSubscription(null);
      setCancelReason('');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to cancel subscription';
      toast.error(msg);
    },
  });

  const handleCancelSubscription = () => {
    if (selectedSubscription) {
      cancelMutation.mutate({ id: selectedSubscription.id, reason: cancelReason });
    }
  };

  const openDetailsDialog = (subscription: ISubscription) => {
    setSelectedSubscription(subscription);
    setDetailsDialogOpen(true);
  };

  const openCancelDialog = (subscription: ISubscription) => {
    setSelectedSubscription(subscription);
    setCancelDialogOpen(true);
  };

  const subscriptions = data?.data || [];
  const totalSubscriptions = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;
  const activeSubscriptions = subscriptions.filter((s) => s.isActive && !s.canceledAt).length;
  const canceledSubscriptions = subscriptions.filter((s) => s.canceledAt).length;

  // Calculate expiring soon (within 7 days)
  const expiringCount = subscriptions.filter((s) => {
    if (!s.isActive || s.canceledAt) return false;
    const endDate = new Date(s.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  }).length;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Active Subscriptions</h1>
            <p className="text-muted-foreground">View and manage employer subscriptions</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceled</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canceledSubscriptions}</div>
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
                placeholder="Search by employer name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>A list of all employer subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading subscriptions...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-destructive">Failed to load subscriptions</div>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No subscriptions found</h3>
              <p className="text-muted-foreground">No active subscriptions match your filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription, index) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {subscription.employer
                              ? `${subscription.employer.firstName} ${subscription.employer.lastName}`
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subscription.employer?.email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.plan}</div>
                          <div className="text-xs text-muted-foreground">
                            {subscription.billingCycle}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {subscription.currency} {subscription.amount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(subscription.startDate)}</div>
                          <div className="text-muted-foreground">
                            to {formatDate(subscription.endDate)}
                          </div>
                          {isExpiringSoon(subscription.endDate) &&
                            subscription.isActive &&
                            !subscription.canceledAt && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-amber-600 border-amber-600"
                              >
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Expiring Soon
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>
                            Jobs: {subscription.jobPostingUsed}/{subscription.jobPostingLimit}
                          </div>
                          <div>
                            Featured: {subscription.featuredJobsUsed}/
                            {subscription.featuredJobsLimit}
                          </div>
                          <div>
                            Resume: {subscription.resumeAccessUsed}/{subscription.resumeAccessLimit}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {subscription.canceledAt ? (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Canceled
                          </Badge>
                        ) : subscription.isActive ? (
                          <Badge variant="default">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetailsDialog(subscription)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {subscription.isActive && !subscription.canceledAt && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCancelDialog(subscription)}
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({totalSubscriptions} total)
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
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>Complete subscription information</DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employer</Label>
                  <div className="font-medium">
                    {selectedSubscription.employer
                      ? `${selectedSubscription.employer.firstName} ${selectedSubscription.employer.lastName}`
                      : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSubscription.employer?.email}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan</Label>
                  <div className="font-medium">{selectedSubscription.plan}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSubscription.billingCycle}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <div className="font-medium">
                    {selectedSubscription.currency} {selectedSubscription.amount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Auto Renew</Label>
                  <div className="font-medium">
                    {selectedSubscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <div className="font-medium">{formatDate(selectedSubscription.startDate)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <div className="font-medium">{formatDate(selectedSubscription.endDate)}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="text-muted-foreground mb-2 block">Usage Statistics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Job Postings</div>
                    <div className="text-2xl font-bold">
                      {selectedSubscription.jobPostingUsed} / {selectedSubscription.jobPostingLimit}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Featured Jobs</div>
                    <div className="text-2xl font-bold">
                      {selectedSubscription.featuredJobsUsed} /{' '}
                      {selectedSubscription.featuredJobsLimit}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Resume Access</div>
                    <div className="text-2xl font-bold">
                      {selectedSubscription.resumeAccessUsed} /{' '}
                      {selectedSubscription.resumeAccessLimit}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Highlighted Jobs</div>
                    <div className="text-2xl font-bold">
                      {selectedSubscription.highlightedJobsUsed} /{' '}
                      {selectedSubscription.highlightedJobsLimit}
                    </div>
                  </div>
                </div>
              </div>
              {selectedSubscription.canceledAt && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Canceled At</Label>
                  <div className="font-medium text-destructive">
                    {formatDate(selectedSubscription.canceledAt)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? This will immediately revoke access
              to premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Cancellation Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please provide a reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Canceling...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionsListPage;
