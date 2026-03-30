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
  BookMarked,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IMasterDegree, IMasterFieldOfStudy, MasterDataType } from '@/types';

interface FieldsResponse {
  data: IMasterFieldOfStudy[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface DegreesResponse {
  data: IMasterDegree[];
}

// Extended type to include degree info
interface FieldWithDegree extends IMasterFieldOfStudy {
  degree?: IMasterDegree;
}

const FieldsOfStudyListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<'all' | MasterDataType>('all');
  const [selectedDegreeFilter, setSelectedDegreeFilter] = useState<string>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldWithDegree | null>(null);

  // Form state
  const [fieldName, setFieldName] = useState('');
  const [selectedDegreeId, setSelectedDegreeId] = useState('');
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<MasterDataType>('master-typed');

  // Fetch all degrees for dropdowns
  const { data: degreesData } = useQuery({
    queryKey: ['all-degrees'],
    queryFn: async () => {
      const response = await http.get(`${endpoints.degrees.list}?limit=1000`);
      return response as unknown as DegreesResponse;
    },
  });

  const allDegrees = degreesData?.data || [];

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, selectedDegreeFilter]);

  // Fetch fields for the selected degree (or all if no degree selected)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fields', selectedDegreeFilter, page, limit, debouncedSearch, typeFilter],
    queryFn: async () => {
      if (selectedDegreeFilter === 'all') {
        // When no degree filter, we need to fetch from all degrees
        // This is a simplified approach - in production you might want a dedicated endpoint
        const allFieldsPromises = allDegrees.map(async (degree) => {
          try {
            const params = new URLSearchParams({
              page: '1',
              limit: '1000',
            });
            if (typeFilter !== 'all') params.set('type', typeFilter);
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

            const response = await http.get(
              `${endpoints.degrees.fieldsOfStudy(degree.id)}?${params}`,
            );
            const fieldsData = response as unknown as FieldsResponse;
            return (fieldsData.data || []).map((field) => ({ ...field, degree }));
          } catch {
            return [];
          }
        });

        const allFieldsArrays = await Promise.all(allFieldsPromises);
        const allFields = allFieldsArrays.flat();

        // Apply pagination manually
        const offset = (page - 1) * limit;
        const paginatedFields = allFields.slice(offset, offset + limit);

        return {
          data: paginatedFields,
          meta: {
            total: allFields.length,
            page,
            limit,
            totalPages: Math.ceil(allFields.length / limit),
          },
        };
      } else {
        // Fetch fields for specific degree
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (typeFilter !== 'all') params.set('type', typeFilter);

        const response = await http.get(
          `${endpoints.degrees.fieldsOfStudy(selectedDegreeFilter)}?${params}`,
        );
        const fieldsData = response as unknown as FieldsResponse;
        const degree = allDegrees.find((d) => d.id === selectedDegreeFilter);

        return {
          data: (fieldsData.data || []).map((field) => ({ ...field, degree })),
          meta: fieldsData.meta,
        };
      }
    },
    enabled: allDegrees.length > 0,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async ({ degreeId, name }: { degreeId: string; name: string }) => {
      return await http.post(endpoints.fieldsOfStudy.create(degreeId), {
        name: name.trim(),
      });
    },
    onSuccess: () => {
      setPage(1);
      queryClient.refetchQueries({ queryKey: ['fields'] });
      refetch();
      toast.success('Field of study added successfully');
      setAddDialogOpen(false);
      setFieldName('');
      setSelectedDegreeId('');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to add field of study';
      toast.error(msg);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, type }: { id: string; name: string; type: MasterDataType }) => {
      return await http.put(endpoints.fieldsOfStudy.update(id), { name, type });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['fields'] });
      refetch();
      toast.success('Field of study updated successfully');
      setEditDialogOpen(false);
      setSelectedField(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update field of study';
      toast.error(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.fieldsOfStudy.delete(id));
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['fields'] });
      refetch();
      toast.success('Field of study deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedField(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to delete field of study';
      toast.error(msg);
    },
  });

  const handleAddSubmit = () => {
    if (!fieldName.trim()) {
      toast.error('Field name is required');
      return;
    }
    if (!selectedDegreeId) {
      toast.error('Please select a degree');
      return;
    }
    createMutation.mutate({ degreeId: selectedDegreeId, name: fieldName });
  };

  const handleEditOpen = (field: FieldWithDegree) => {
    setSelectedField(field);
    setEditFieldName(field.name);
    setEditFieldType(field.type);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editFieldName.trim()) {
      toast.error('Field name is required');
      return;
    }
    if (!selectedField) return;
    updateMutation.mutate({
      id: selectedField.id,
      name: editFieldName.trim(),
      type: editFieldType,
    });
  };

  const handleDeleteOpen = (field: FieldWithDegree) => {
    setSelectedField(field);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedField) return;
    deleteMutation.mutate(selectedField.id);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as 'all' | MasterDataType);
  };

  const handleDegreeFilterChange = (value: string) => {
    setSelectedDegreeFilter(value);
  };

  const getTypeBadge = (type: MasterDataType) => {
    if (type === 'master-typed') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <BookOpen className="mr-1 h-3 w-3" />
          Master
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Users className="mr-1 h-3 w-3" />
        User Typed
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

  const fields = data?.data || [];
  const totalFields = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || 1;

  const masterCount = fields.filter((f) => f.type === 'master-typed').length;
  const userCount = fields.filter((f) => f.type === 'user-typed').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fields of Study</h1>
          <p className="text-muted-foreground mt-2">
            Manage fields of study linked to degree programs
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Field of Study
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookMarked className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fields</p>
                <p className="text-2xl font-bold">{totalFields}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Master Fields</p>
                <p className="text-2xl font-bold">{masterCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User Typed</p>
                <p className="text-2xl font-bold">{userCount}</p>
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
                placeholder="Search fields..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDegreeFilter} onValueChange={handleDegreeFilterChange}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter by degree" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Degrees</SelectItem>
                {allDegrees.map((degree) => (
                  <SelectItem key={degree.id} value={degree.id}>
                    {degree.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="master-typed">Master Fields</SelectItem>
                <SelectItem value="user-typed">User Typed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fields Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fields of Study List</CardTitle>
          <CardDescription>
            {totalFields} field{totalFields !== 1 ? 's' : ''} of study total
            {typeFilter !== 'all' &&
              ` (filtered by ${typeFilter === 'master-typed' ? 'master' : 'user typed'})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading fields...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load fields. Please try again.
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-12">
              <BookMarked className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No fields of study found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || typeFilter !== 'all' || selectedDegreeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add fields to get started'}
              </p>
              {!search && typeFilter === 'all' && selectedDegreeFilter === 'all' && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Field
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Degree</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{field.degree?.name || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell>{getTypeBadge(field.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(field.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(field)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOpen(field)}
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
                    Page {currentPage} of {totalPages} &mdash; {totalFields} total
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

      {/* Add Field Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Field of Study</DialogTitle>
            <DialogDescription>
              Add a field of study to a degree program. Fields added here are marked as{' '}
              <strong>master-typed</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="degree">
                Degree <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedDegreeId} onValueChange={setSelectedDegreeId}>
                <SelectTrigger id="degree">
                  <SelectValue placeholder="Select degree" />
                </SelectTrigger>
                <SelectContent>
                  {allDegrees.map((degree) => (
                    <SelectItem key={degree.id} value={degree.id}>
                      {degree.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldName">
                Field Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fieldName"
                placeholder="e.g. Computer Science, Mechanical Engineering"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubmit();
                }}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                This field will be tagged as <strong>master-typed</strong> and visible in candidate
                field suggestions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setFieldName('');
                setSelectedDegreeId('');
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={createMutation.isPending || !fieldName.trim() || !selectedDegreeId}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field of Study</DialogTitle>
            <DialogDescription>Update the field name or change its type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedField?.degree && (
              <div className="space-y-2">
                <Label>Degree</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedField.degree.name}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editFieldName">
                Field Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editFieldName"
                placeholder="e.g. Computer Science"
                value={editFieldName}
                onChange={(e) => setEditFieldName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFieldType">Field Type</Label>
              <Select
                value={editFieldType}
                onValueChange={(val) => setEditFieldType(val as MasterDataType)}
              >
                <SelectTrigger id="editFieldType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master-typed">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Master Typed
                    </div>
                  </SelectItem>
                  <SelectItem value="user-typed">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-600" />
                      User Typed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Promote a user-typed field to master-typed to make it an official suggestion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedField(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending || !editFieldName.trim()}
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
            <AlertDialogTitle>Delete Field of Study</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{selectedField?.name}&quot;</strong>?
              This action cannot be undone.
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

export default FieldsOfStudyListPage;
