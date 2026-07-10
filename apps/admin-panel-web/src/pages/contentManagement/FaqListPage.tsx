/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Search, Edit, Trash2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IFaq } from '@/types';

type StatusFilter = 'all' | 'active' | 'inactive';

interface FaqFormState {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm: FaqFormState = {
  question: '',
  answer: '',
  category: '',
  sortOrder: 0,
  isActive: true,
};

const FaqListPage = () => {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<IFaq | null>(null);
  const [form, setForm] = useState<FaqFormState>(emptyForm);

  const {
    data: faqs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const res: any = await http.get(endpoints.faqs.list);
      return (Array.isArray(res) ? res : (res?.data ?? [])) as IFaq[];
    },
  });

  // Distinct categories for the filter dropdown, derived from loaded data
  const categories = useMemo(
    () =>
      Array.from(
        new Set(faqs.map((f) => (f.category || '').trim()).filter((c) => c.length > 0)),
      ).sort(),
    [faqs],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return faqs.filter((f) => {
      if (categoryFilter !== 'all' && (f.category || '') !== categoryFilter) return false;
      if (statusFilter === 'active' && !f.isActive) return false;
      if (statusFilter === 'inactive' && f.isActive) return false;
      if (q && !`${f.question} ${f.answer}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [faqs, debouncedSearch, categoryFilter, statusFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['faqs'] });

  const createMutation = useMutation({
    mutationFn: async (payload: FaqFormState) => http.post(endpoints.faqs.create, payload),
    onSuccess: () => {
      invalidate();
      toast.success('FAQ created');
      setAddDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create FAQ'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: Partial<FaqFormState> & { id: string }) =>
      http.put(endpoints.faqs.update(id), body),
    onSuccess: () => {
      invalidate();
      toast.success('FAQ updated');
      setEditDialogOpen(false);
      setSelected(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update FAQ'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => http.delete(endpoints.faqs.delete(id)),
    onSuccess: () => {
      invalidate();
      toast.success('FAQ deleted');
      setDeleteDialogOpen(false);
      setSelected(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete FAQ'),
  });

  const handleAddSubmit = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    createMutation.mutate({
      ...form,
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim(),
    });
  };

  const handleEditOpen = (row: IFaq) => {
    setSelected(row);
    setForm({
      question: row.question,
      answer: row.answer,
      category: row.category || '',
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selected) return;
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    updateMutation.mutate({
      id: selected.id,
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim(),
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    });
  };

  const toggleStatus = (row: IFaq) =>
    updateMutation.mutate({ id: row.id, isActive: !row.isActive });

  const total = faqs.length;
  const activeCount = faqs.filter((f) => f.isActive).length;

  const FormFields = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="faqQuestion">
          Question <span className="text-red-500">*</span>
        </Label>
        <Input
          id="faqQuestion"
          placeholder="e.g. How do I reset my password?"
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="faqAnswer">
          Answer <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="faqAnswer"
          rows={5}
          placeholder="Write the answer shown to users..."
          value={form.answer}
          onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="faqCategory">Category</Label>
          <Input
            id="faqCategory"
            list="faq-category-options"
            placeholder="e.g. Account"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <datalist id="faq-category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="faqSort">Sort Order</Label>
          <Input
            id="faqSort"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="faqActive">Active</Label>
          <p className="text-xs text-muted-foreground">Inactive FAQs are hidden from users.</p>
        </div>
        <Switch
          id="faqActive"
          checked={form.isActive}
          onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQ</h1>
          <p className="text-muted-foreground mt-2">
            Manage the frequently asked questions shown to users on the public site.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setAddDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search question or answer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>FAQs</CardTitle>
          <CardDescription>
            {total} total &middot; {activeCount} active
            {filtered.length !== total ? ` — ${filtered.length} shown` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">Failed to load. Please try again.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No FAQs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {total === 0 ? 'Add your first FAQ to get started' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground text-sm">{row.sortOrder}</TableCell>
                    <TableCell className="font-medium max-w-md">
                      <div className="truncate">{row.question}</div>
                      <div className="truncate text-xs text-muted-foreground">{row.answer}</div>
                    </TableCell>
                    <TableCell>
                      {row.category ? (
                        <Badge variant="outline">{row.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isActive ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-600 border-gray-200"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={row.isActive ? 'Disable' : 'Enable'}
                          onClick={() => toggleStatus(row)}
                          disabled={updateMutation.isPending}
                        >
                          {row.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={() => handleEditOpen(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelected(row);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add FAQ</DialogTitle>
            <DialogDescription>Create a new frequently asked question.</DialogDescription>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>Update the question, answer, or status.</DialogDescription>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>&quot;{selected?.question}&quot;</strong>? This cannot be
              undone. To hide it instead, disable it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FaqListPage;
