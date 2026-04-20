/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
import { MessageSquare, Loader2, Mail, Eye, CheckCircle, Trash2, Save } from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  new: {
    label: 'New',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  read: {
    label: 'Read',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  responded: {
    label: 'Responded',
    variant: 'default',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  archived: {
    label: 'Archived',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  },
};

export default function ContactSubmissionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const limit = 20;

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['contact-submissions', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      return http.get(`${endpoints.contactSubmissions.list}?${params.toString()}`);
    },
  });

  const submissionsData = responseData as any;
  const submissions: ContactSubmission[] = submissionsData?.data || [];
  const pagination = submissionsData?.pagination || {};

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; status?: string; adminNotes?: string }) =>
      http.put(endpoints.contactSubmissions.update(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      toast.success('Submission updated successfully');
      setDetailsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => http.delete(endpoints.contactSubmissions.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-submissions'] });
      toast.success('Submission deleted');
      setDetailsOpen(false);
      setDeleteOpen(false);
    },
  });

  const openDetails = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setEditStatus(submission.status);
    setEditNotes(submission.adminNotes || '');
    setDetailsOpen(true);
  };

  const handleSave = () => {
    if (!selectedSubmission) return;
    updateMutation.mutate({
      id: selectedSubmission.id,
      status: editStatus,
      adminNotes: editNotes.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedSubmission) return;
    deleteMutation.mutate(selectedSubmission.id);
  };

  // Count stats from current data (or show from pagination)
  const totalCount = pagination.totalSubmission || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Submissions</h1>
          <p className="text-muted-foreground">
            View and manage messages received from the contact form
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> New
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {submissions.filter((s) => s.status === 'new').length || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Read
            </CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {submissions.filter((s) => s.status === 'read').length || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Responded
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {submissions.filter((s) => s.status === 'responded').length || '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-2" />
              <p>No contact submissions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const config = statusConfig[submission.status] || statusConfig.new;
                  return (
                    <TableRow
                      key={submission.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetails(submission)}
                    >
                      <TableCell className="font-medium">{submission.name}</TableCell>
                      <TableCell>{submission.email}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{submission.message}</TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className={config.className}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(submission.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.pageCount} ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Submission</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{selectedSubmission.email}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Message</Label>
                <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {selectedSubmission.message}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Received</Label>
                <p className="text-sm">
                  {new Date(selectedSubmission.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add internal notes about this submission..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact submission from{' '}
              <strong>{selectedSubmission?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
