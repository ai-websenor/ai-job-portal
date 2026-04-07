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
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IFilterOption, FilterGroup } from '@/types';

interface FilterOptionsResponse {
  data: IFilterOption[];
  pagination: {
    total: number;
    pageCount: number;
    currentPage: number;
    hasNextPage: boolean;
  };
}

const FILTER_GROUPS: { value: FilterGroup; label: string }[] = [
  { value: 'job_type', label: 'Job Type' },
  { value: 'experience_level', label: 'Experience Level' },
  { value: 'location_type', label: 'Location Type' },
  { value: 'work_mode', label: 'Work Mode' },
  { value: 'pay_rate', label: 'Pay Rate' },
  { value: 'posted_within', label: 'Posted Within' },
  { value: 'salary_range', label: 'Salary Range' },
  { value: 'company_type', label: 'Company Type' },
  { value: 'sort_by', label: 'Sort By' },
];

const JobFiltersListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [groupFilter, setGroupFilter] = useState<'all' | FilterGroup>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<IFilterOption | null>(null);

  // Form state
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('job_type');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterIsActive, setFilterIsActive] = useState(true);
  const [filterDisplayOrder, setFilterDisplayOrder] = useState(1);

  const [editGroup, setEditGroup] = useState<FilterGroup>('job_type');
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editDisplayOrder, setEditDisplayOrder] = useState(1);

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, groupFilter]);

  // Fetch filter options
  const { data, isLoading, error } = useQuery({
    queryKey: ['filterOptions', page, limit, debouncedSearch, groupFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (groupFilter !== 'all') params.set('group', groupFilter);
      const response = await http.get(`${endpoints.filterOptions.list}?${params}`);
      return response as unknown as FilterOptionsResponse;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      group: FilterGroup;
      label: string;
      value: string;
      isActive: boolean;
      displayOrder: number;
    }) => {
      return await http.post(endpoints.filterOptions.create, data);
    },
    onSuccess: () => {
      setPage(1);
      queryClient.refetchQueries({ queryKey: ['filterOptions'] });
      toast.success('Filter option added successfully');
      setAddDialogOpen(false);
      resetAddForm();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to add filter option';
      toast.error(msg);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        label?: string;
        value?: string;
        isActive?: boolean;
        displayOrder?: number;
      };
    }) => {
      return await http.put(endpoints.filterOptions.update(id), data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['filterOptions'] });
      toast.success('Filter option updated successfully');
      setEditDialogOpen(false);
      setSelectedFilter(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update filter option';
      toast.error(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.filterOptions.delete(id));
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['filterOptions'] });
      toast.success('Filter option deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedFilter(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to delete filter option';
      toast.error(msg);
    },
  });

  const resetAddForm = () => {
    setFilterGroup('job_type');
    setFilterLabel('');
    setFilterValue('');
    setFilterIsActive(true);
    setFilterDisplayOrder(1);
  };

  const handleAddSubmit = () => {
    if (!filterLabel.trim()) {
      toast.error('Label is required');
      return;
    }
    if (!filterValue.trim()) {
      toast.error('Value is required');
      return;
    }
    createMutation.mutate({
      group: filterGroup,
      label: filterLabel.trim(),
      value: filterValue.trim(),
      isActive: filterIsActive,
      displayOrder: filterDisplayOrder,
    });
  };

  const handleEditOpen = (option: IFilterOption) => {
    setSelectedFilter(option);
    setEditGroup(option.group);
    setEditLabel(option.label);
    setEditValue(option.value);
    setEditIsActive(option.isActive);
    setEditDisplayOrder(option.displayOrder);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editLabel.trim()) {
      toast.error('Label is required');
      return;
    }
    if (!editValue.trim()) {
      toast.error('Value is required');
      return;
    }
    if (!selectedFilter) return;
    updateMutation.mutate({
      id: selectedFilter.id,
      data: {
        label: editLabel.trim(),
        value: editValue.trim(),
        isActive: editIsActive,
        displayOrder: editDisplayOrder,
      },
    });
  };

  const handleDeleteOpen = (option: IFilterOption) => {
    setSelectedFilter(option);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedFilter) return;
    deleteMutation.mutate(selectedFilter.id);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleGroupFilterChange = (value: string) => {
    setGroupFilter(value as 'all' | FilterGroup);
    setPage(1);
  };

  const getGroupBadge = (group: FilterGroup) => {
    const groupData = FILTER_GROUPS.find((g) => g.value === group);
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <Layers className="mr-1 h-3 w-3" />
        {groupData?.label || group}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filterOptions = data?.data || [];
  const totalFilters = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pageCount || 1;
  const currentPage = data?.pagination?.currentPage || 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Filter className="h-7 w-7" />
            Job Filters
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage filter options for job search to ensure accurate and relevant results
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Filter Option
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Options</p>
                <p className="text-2xl font-bold">{totalFilters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Layers className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filter Groups</p>
                <p className="text-2xl font-bold">{FILTER_GROUPS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowUpDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {filterOptions.filter((f) => f.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ArrowUpDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">
                  {filterOptions.filter((f) => !f.isActive).length}
                </p>
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
                placeholder="Search filter options..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={handleGroupFilterChange}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {FILTER_GROUPS.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Filter Options Table */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options List</CardTitle>
          <CardDescription>
            {totalFilters} filter option{totalFilters !== 1 ? 's' : ''} total
            {groupFilter !== 'all' &&
              ` (filtered by ${FILTER_GROUPS.find((g) => g.value === groupFilter)?.label})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading filter options...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load filter options. Please try again.
            </div>
          ) : filterOptions.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No filter options found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || groupFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add filter options to get started'}
              </p>
              {!search && groupFilter === 'all' && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Filter Option
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Display Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterOptions.map((option, index) => (
                    <TableRow key={option.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{option.label}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{option.value}</code>
                      </TableCell>
                      <TableCell>{getGroupBadge(option.group)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{option.displayOrder}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={option.isActive}
                            onCheckedChange={(checked) =>
                              updateMutation.mutate({ id: option.id, data: { isActive: checked } })
                            }
                            disabled={updateMutation.isPending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {option.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(option.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(option)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOpen(option)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                    Page {currentPage} of {totalPages} &mdash; {totalFilters} total
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

      {/* Add Filter Option Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Filter Option</DialogTitle>
            <DialogDescription>
              Create a new filter option for job search. This will help users narrow down job
              listings effectively.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filterGroup">
                Filter Group <span className="text-red-500">*</span>
              </Label>
              <Select value={filterGroup} onValueChange={(v) => setFilterGroup(v as FilterGroup)}>
                <SelectTrigger id="filterGroup">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterLabel">
                Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="filterLabel"
                placeholder="e.g. Full-Time, Entry Level, Remote"
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Display name shown to users in the filter UI
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterValue">
                Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="filterValue"
                placeholder="e.g. full_time, entry_level, remote"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Internal value used for filtering (lowercase, underscores)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterDisplayOrder">Display Order</Label>
                <Input
                  id="filterDisplayOrder"
                  type="number"
                  min="1"
                  value={filterDisplayOrder}
                  onChange={(e) => setFilterDisplayOrder(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterIsActive">Active</Label>
                <div className="flex items-center h-10">
                  <Switch
                    id="filterIsActive"
                    checked={filterIsActive}
                    onCheckedChange={setFilterIsActive}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {filterIsActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetAddForm();
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={createMutation.isPending || !filterLabel.trim() || !filterValue.trim()}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Filter Option'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Filter Option Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Filter Option</DialogTitle>
            <DialogDescription>Update the filter option details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editGroup">Filter Group</Label>
              <Select
                value={editGroup}
                onValueChange={(v) => setEditGroup(v as FilterGroup)}
                disabled
              >
                <SelectTrigger id="editGroup" className="opacity-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Group cannot be changed after creation
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLabel">
                Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editLabel"
                placeholder="e.g. Full-Time"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editValue">
                Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editValue"
                placeholder="e.g. full_time"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDisplayOrder">Display Order</Label>
                <Input
                  id="editDisplayOrder"
                  type="number"
                  min="1"
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIsActive">Active</Label>
                <div className="flex items-center h-10">
                  <Switch
                    id="editIsActive"
                    checked={editIsActive}
                    onCheckedChange={setEditIsActive}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {editIsActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedFilter(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending || !editLabel.trim() || !editValue.trim()}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{selectedFilter?.label}&quot;</strong>?
              This action cannot be undone and will remove this option from job search filters.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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

export default JobFiltersListPage;
