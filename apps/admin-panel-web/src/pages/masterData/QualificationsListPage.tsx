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
import {
  Search,
  Edit,
  EyeOff,
  ArrowUpCircle,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type {
  IMasterDataItem,
  IMasterDataListResponse,
  IMasterDataPendingCounts,
  MasterDataType,
} from '@/types/masterData';

type TypeFilter = 'all' | MasterDataType;
type StatusFilter = 'all' | 'active' | 'inactive';

/**
 * The axios interceptor in `@/api/http` rejects with `error.response.data`,
 * so the API envelope is the error object itself. Older pages also read the
 * raw axios shape, so both are checked here.
 */
const readApiError = (err: any) => {
  const raw = err?.message ?? err?.response?.data?.message;
  const message = Array.isArray(raw) ? raw.join(', ') : raw;
  const status = err?.statusCode ?? err?.status ?? err?.response?.status;
  return { message: typeof message === 'string' ? message : undefined, status };
};

const QualificationsListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  // Default to the review queue: values employers typed and nobody has looked at yet.
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('user-typed');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Dialog states
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selected, setSelected] = useState<IMasterDataItem | null>(null);

  // Rename form state
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['qualifications', page, limit, debouncedSearch, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('isActive', String(statusFilter === 'active'));
      const response = await http.get(`${endpoints.qualifications.list}?${params}`);
      return response as unknown as IMasterDataListResponse;
    },
  });

  // How many values are still waiting for a review decision.
  const { data: pendingCounts } = useQuery({
    queryKey: ['master-data', 'pending-counts'],
    queryFn: async () => {
      const response: any = await http.get(endpoints.masterData.pendingCounts);
      return (response?.data ?? response) as IMasterDataPendingCounts;
    },
  });

  const refreshLists = () => {
    queryClient.refetchQueries({ queryKey: ['qualifications'] });
    queryClient.refetchQueries({ queryKey: ['master-data', 'pending-counts'] });
  };

  const closeAllDialogs = () => {
    setPromoteDialogOpen(false);
    setRenameDialogOpen(false);
    setDeactivateDialogOpen(false);
    setSelected(null);
    setRenameError(null);
  };

  const promoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.patch(endpoints.qualifications.update(id), { type: 'master-typed' });
    },
    onSuccess: () => {
      refreshLists();
      toast.success('Promoted to master');
      closeAllDialogs();
    },
    onError: (err: any) => {
      toast.error(readApiError(err).message || 'Could not promote this qualification');
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await http.patch(endpoints.qualifications.update(id), { name });
    },
    onSuccess: () => {
      refreshLists();
      toast.success('Qualification renamed');
      closeAllDialogs();
    },
    onError: (err: any) => {
      const { message, status } = readApiError(err);
      if (status === 409) {
        // Keep the dialog open so the admin can pick another name.
        setRenameError(
          message || `"${renameValue.trim()}" is already in the list. Pick a different name.`,
        );
        return;
      }
      setRenameError(message || 'Could not rename this qualification');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.qualifications.delete(id));
    },
    onSuccess: () => {
      refreshLists();
      toast.success('Qualification deactivated');
      closeAllDialogs();
    },
    onError: (err: any) => {
      toast.error(readApiError(err).message || 'Could not deactivate this qualification');
    },
  });

  const handlePromoteOpen = (row: IMasterDataItem) => {
    setSelected(row);
    setPromoteDialogOpen(true);
  };

  const handleRenameOpen = (row: IMasterDataItem) => {
    setSelected(row);
    setRenameValue(row.name);
    setRenameError(null);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!selected) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameError('Name is required');
      return;
    }
    if (name === selected.name) {
      closeAllDialogs();
      return;
    }
    setRenameError(null);
    renameMutation.mutate({ id: selected.id, name });
  };

  const handleDeactivateOpen = (row: IMasterDataItem) => {
    setSelected(row);
    setDeactivateDialogOpen(true);
  };

  const getTypeBadge = (type: MasterDataType) =>
    type === 'master-typed' ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <BookOpen className="mr-1 h-3 w-3" />
        Master
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Users className="mr-1 h-3 w-3" />
        User Typed
      </Badge>
    );

  const getStatusBadge = (isActive: boolean) =>
    isActive ? (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
        Inactive
      </Badge>
    );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const rows = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || 1;
  const awaitingReview = pendingCounts?.qualifications ?? 0;

  const isFiltered = !!search.trim() || typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Qualifications</h1>
          <p className="text-muted-foreground mt-2">
            Qualifications employers typed in show up here. Promote the ones worth suggesting to
            everyone.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting review</p>
                <p className="text-2xl font-bold">{awaitingReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matching this view</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search qualifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as TypeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user-typed">User Typed</SelectItem>
                <SelectItem value="master-typed">Master</SelectItem>
                <SelectItem value="all">All Types</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Qualifications List</CardTitle>
          <CardDescription>
            {total} qualification{total !== 1 ? 's' : ''} in this view
            {typeFilter !== 'all' &&
              ` (filtered by ${typeFilter === 'master-typed' ? 'master' : 'user typed'})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading qualifications...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load qualifications. Please try again.
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No qualifications found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isFiltered
                  ? 'Try adjusting your filters'
                  : 'Qualifications appear here once employers start using them'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{getTypeBadge(row.type)}</TableCell>
                      <TableCell>{getStatusBadge(row.isActive)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {row.type === 'user-typed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-700 hover:text-blue-700"
                              title="Promote to master"
                              onClick={() => handlePromoteOpen(row)}
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Rename"
                            onClick={() => handleRenameOpen(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {row.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              title="Deactivate"
                              onClick={() => handleDeactivateOpen(row)}
                            >
                              <EyeOff className="h-4 w-4" />
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
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} &mdash; {total} total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={currentPage >= totalPages}
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

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => (open ? setRenameDialogOpen(true) : closeAllDialogs())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Qualification</DialogTitle>
            <DialogDescription>
              Everywhere this qualification is already used will show the new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="renameQualification">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="renameQualification"
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value);
                  setRenameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                }}
                autoFocus
              />
              {renameError && <p className="text-sm text-destructive">{renameError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAllDialogs} disabled={renameMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={renameMutation.isPending || !renameValue.trim()}
            >
              {renameMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Confirmation */}
      <AlertDialog
        open={promoteDialogOpen}
        onOpenChange={(open) => (open ? setPromoteDialogOpen(true) : closeAllDialogs())}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to master</AlertDialogTitle>
            <AlertDialogDescription>
              Add <strong>&quot;{selected?.name}&quot;</strong> to the master list, so it is
              suggested to everyone creating a job.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selected) promoteMutation.mutate(selected.id);
              }}
              disabled={promoteMutation.isPending}
            >
              {promoteMutation.isPending ? 'Promoting...' : 'Promote to master'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={deactivateDialogOpen}
        onOpenChange={(open) => (open ? setDeactivateDialogOpen(true) : closeAllDialogs())}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Qualification</AlertDialogTitle>
            <AlertDialogDescription>
              Hide <strong>&quot;{selected?.name}&quot;</strong> from suggestions. Jobs already
              using it keep the label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selected) deactivateMutation.mutate(selected.id);
              }}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QualificationsListPage;
