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
  Plus,
  Search,
  Edit,
  EyeOff,
  Building2,
  Network,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IJobCategory, SkillType } from '@/types';

interface JobCategoriesResponse {
  data: IJobCategory[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type LevelFilter = 'all' | 'parent' | 'child';

const IndustriesListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<'all' | SkillType>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selected, setSelected] = useState<IJobCategory | null>(null);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addLevel, setAddLevel] = useState<'parent' | 'child'>('parent');
  const [addParentId, setAddParentId] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<SkillType>('master-typed');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['job-categories', page, limit, debouncedSearch, typeFilter, levelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (levelFilter !== 'all') params.set('level', levelFilter);
      const response = await http.get(`${endpoints.jobCategories.list}?${params}`);
      return response as unknown as JobCategoriesResponse;
    },
  });

  // Master Industries — used as the parent options when adding a Department.
  const { data: industryOptions } = useQuery({
    queryKey: ['job-categories', 'parents'],
    queryFn: async () => {
      const response: any = await http.get(endpoints.category.parents);
      return (response?.data ?? []) as IJobCategory[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; parentId?: string }) => {
      return await http.post(endpoints.jobCategories.create, payload);
    },
    onSuccess: () => {
      setPage(1);
      queryClient.refetchQueries({ queryKey: ['job-categories'] });
      toast.success('Added successfully');
      setAddDialogOpen(false);
      setAddName('');
      setAddLevel('parent');
      setAddParentId('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add'),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      type?: SkillType;
      isActive?: boolean;
    }) => {
      const { id, ...body } = payload;
      return await http.put(endpoints.jobCategories.update(id), body);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['job-categories'] });
      toast.success('Updated successfully');
      setEditDialogOpen(false);
      setDeactivateDialogOpen(false);
      setSelected(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });

  const handleAddSubmit = () => {
    if (!addName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (addLevel === 'child' && !addParentId) {
      toast.error('Select a parent Industry for the Department');
      return;
    }
    createMutation.mutate({
      name: addName.trim(),
      parentId: addLevel === 'child' ? addParentId : undefined,
    });
  };

  const handleEditOpen = (row: IJobCategory) => {
    setSelected(row);
    setEditName(row.name);
    setEditType(row.type);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editName.trim() || !selected) return;
    updateMutation.mutate({ id: selected.id, name: editName.trim(), type: editType });
  };

  const handleDeactivateConfirm = () => {
    if (!selected) return;
    updateMutation.mutate({ id: selected.id, isActive: false });
  };

  const getTypeBadge = (type: SkillType) =>
    type === 'master-typed' ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <BookOpen className="mr-1 h-3 w-3" />
        Master
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Users className="mr-1 h-3 w-3" />
        Employer Typed
      </Badge>
    );

  const getLevelBadge = (row: IJobCategory) =>
    row.parentId ? (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <Network className="mr-1 h-3 w-3" />
        Department
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <Building2 className="mr-1 h-3 w-3" />
        Industry
      </Badge>
    );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const rows = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Industries &amp; Departments</h1>
          <p className="text-muted-foreground mt-2">
            Review employer-typed Industries/Departments and promote them into the job-creation
            dropdowns.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={levelFilter}
              onValueChange={(v) => {
                setLevelFilter(v as LevelFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="parent">Industries</SelectItem>
                <SelectItem value="child">Departments</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as 'all' | SkillType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="master-typed">Master</SelectItem>
                <SelectItem value="user-typed">Employer Typed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
          <CardDescription>{total} total</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">Failed to load. Please try again.</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">Nothing found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Type</TableHead>
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
                      <TableCell>{getLevelBadge(row)}</TableCell>
                      <TableCell>{getTypeBadge(row.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(row)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelected(row);
                              setDeactivateDialogOpen(true);
                            }}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Industry / Department</DialogTitle>
            <DialogDescription>
              Added here as <strong>master-typed</strong> and shown in the job-creation dropdowns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={addLevel} onValueChange={(v) => setAddLevel(v as 'parent' | 'child')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Industry</SelectItem>
                  <SelectItem value="child">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addLevel === 'child' && (
              <div className="space-y-2">
                <Label>
                  Parent Industry <span className="text-red-500">*</span>
                </Label>
                <Select value={addParentId} onValueChange={setAddParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {(industryOptions ?? []).map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="addName">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="addName"
                placeholder={addLevel === 'parent' ? 'e.g. Healthcare' : 'e.g. Nursing'}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubmit();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={createMutation.isPending || !addName.trim()}
            >
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit</DialogTitle>
            <DialogDescription>Rename or promote to master.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editType">Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as SkillType)}>
                <SelectTrigger id="editType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master-typed">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Master
                    </div>
                  </SelectItem>
                  <SelectItem value="user-typed">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-600" />
                      Employer Typed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Promote an employer-typed value to <strong>master</strong> to make it appear in the
                job-creation dropdowns.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending || !editName.trim()}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate</AlertDialogTitle>
            <AlertDialogDescription>
              Hide <strong>&quot;{selected?.name}&quot;</strong> from lists and dropdowns. Jobs
              already using it keep the label. You can re-add it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              disabled={updateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IndustriesListPage;
