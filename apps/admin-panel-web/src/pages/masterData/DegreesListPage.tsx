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
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IMasterDegree, MasterDataType, EducationLevel } from '@/types';

interface DegreesResponse {
  data: IMasterDegree[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const DegreesListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<'all' | MasterDataType>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | EducationLevel>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState<IMasterDegree | null>(null);

  // Form state
  const [degreeName, setDegreeName] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<EducationLevel>('bachelors');
  const [editDegreeName, setEditDegreeName] = useState('');
  const [editDegreeType, setEditDegreeType] = useState<MasterDataType>('master-typed');
  const [editDegreeLevel, setEditDegreeLevel] = useState<EducationLevel>('bachelors');

  const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
    { value: 'high_school', label: 'High School' },
    { value: 'diploma', label: 'Diploma' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'bachelors', label: 'Bachelors' },
    { value: 'masters', label: 'Masters' },
    { value: 'phd', label: 'PhD/Doctorate' },
  ];

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch degrees
  const { data, isLoading, error } = useQuery({
    queryKey: ['degrees', page, limit, debouncedSearch, typeFilter, levelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (levelFilter !== 'all') params.set('level', levelFilter);
      const response = await http.get(`${endpoints.degrees.list}?${params}`);
      return response as unknown as DegreesResponse;
    },
  });

  // Create mutation (always master-typed when admin adds)
  const createMutation = useMutation({
    mutationFn: async ({ name, level }: { name: string; level: EducationLevel }) => {
      return await http.post(endpoints.degrees.create, {
        name: name.trim(),
        level,
      });
    },
    onSuccess: () => {
      setPage(1);
      queryClient.refetchQueries({ queryKey: ['degrees'] });
      toast.success('Degree added successfully');
      setAddDialogOpen(false);
      setDegreeName('');
      setDegreeLevel('bachelors');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to add degree';
      toast.error(msg);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      type,
      level,
    }: {
      id: string;
      name: string;
      type: MasterDataType;
      level: EducationLevel;
    }) => {
      return await http.put(endpoints.degrees.update(id), { name, type, level });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['degrees'] });
      toast.success('Degree updated successfully');
      setEditDialogOpen(false);
      setSelectedDegree(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update degree';
      toast.error(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.degrees.delete(id));
    },
    onSuccess: (response: any) => {
      queryClient.refetchQueries({ queryKey: ['degrees'] });
      if (response?.data?.softDeleted) {
        toast.warning(response?.message || 'Degree deactivated — it has linked fields of study.');
      } else {
        toast.success('Degree deleted successfully');
      }
      setDeleteDialogOpen(false);
      setSelectedDegree(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to delete degree';
      toast.error(msg);
    },
  });

  const handleAddSubmit = () => {
    if (!degreeName.trim()) {
      toast.error('Degree name is required');
      return;
    }
    createMutation.mutate({ name: degreeName, level: degreeLevel });
  };

  const handleEditOpen = (degree: IMasterDegree) => {
    setSelectedDegree(degree);
    setEditDegreeName(degree.name);
    setEditDegreeType(degree.type);
    setEditDegreeLevel(degree.level);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editDegreeName.trim()) {
      toast.error('Degree name is required');
      return;
    }
    if (!selectedDegree) return;
    updateMutation.mutate({
      id: selectedDegree.id,
      name: editDegreeName.trim(),
      type: editDegreeType,
      level: editDegreeLevel,
    });
  };

  const handleDeleteOpen = (degree: IMasterDegree) => {
    setSelectedDegree(degree);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedDegree) return;
    deleteMutation.mutate(selectedDegree.id);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as 'all' | MasterDataType);
    setPage(1);
  };

  const handleLevelFilterChange = (value: string) => {
    setLevelFilter(value as 'all' | EducationLevel);
    setPage(1);
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

  const getLevelLabel = (level: EducationLevel) => {
    return EDUCATION_LEVELS.find((l) => l.value === level)?.label || level;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const degrees = data?.data || [];
  const totalDegrees = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || 1;

  const masterCount = degrees.filter((d) => d.type === 'master-typed').length;
  const userCount = degrees.filter((d) => d.type === 'user-typed').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Degrees</h1>
          <p className="text-muted-foreground mt-2">
            Manage master degree list used across the platform
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Degree
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Degrees</p>
                <p className="text-2xl font-bold">{totalDegrees}</p>
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
                <p className="text-sm text-muted-foreground">Master Degrees</p>
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
                placeholder="Search degrees..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="master-typed">Master Degrees</SelectItem>
                <SelectItem value="user-typed">User Typed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={handleLevelFilterChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Degrees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Degrees List</CardTitle>
          <CardDescription>
            {totalDegrees} degree{totalDegrees !== 1 ? 's' : ''} total
            {typeFilter !== 'all' &&
              ` (filtered by ${typeFilter === 'master-typed' ? 'master' : 'user typed'})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading degrees...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load degrees. Please try again.
            </div>
          ) : degrees.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No degrees found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || typeFilter !== 'all' || levelFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add degrees to get started'}
              </p>
              {!search && typeFilter === 'all' && levelFilter === 'all' && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Degree
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Degree Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {degrees.map((degree, index) => (
                    <TableRow key={degree.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{degree.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getLevelLabel(degree.level)}</Badge>
                      </TableCell>
                      <TableCell>{getTypeBadge(degree.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(degree.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(degree)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOpen(degree)}
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
                    Page {currentPage} of {totalPages} &mdash; {totalDegrees} total
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

      {/* Add Degree Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Degree</DialogTitle>
            <DialogDescription>
              Add a degree to the master list. Degrees added here are marked as{' '}
              <strong>master-typed</strong> and available to all candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="degreeName">
                Degree Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="degreeName"
                placeholder="e.g. Bachelor of Technology (B.Tech)"
                value={degreeName}
                onChange={(e) => setDegreeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubmit();
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="degreeLevel">
                Education Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={degreeLevel}
                onValueChange={(val) => setDegreeLevel(val as EducationLevel)}
              >
                <SelectTrigger id="degreeLevel">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                This degree will be tagged as <strong>master-typed</strong> and visible in candidate
                degree suggestions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setDegreeName('');
                setDegreeLevel('bachelors');
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={createMutation.isPending || !degreeName.trim()}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Degree'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Degree Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Degree</DialogTitle>
            <DialogDescription>
              Update the degree name, level, or change its type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDegreeName">
                Degree Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editDegreeName"
                placeholder="e.g. Bachelor of Science"
                value={editDegreeName}
                onChange={(e) => setEditDegreeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDegreeLevel">Education Level</Label>
              <Select
                value={editDegreeLevel}
                onValueChange={(val) => setEditDegreeLevel(val as EducationLevel)}
              >
                <SelectTrigger id="editDegreeLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDegreeType">Degree Type</Label>
              <Select
                value={editDegreeType}
                onValueChange={(val) => setEditDegreeType(val as MasterDataType)}
              >
                <SelectTrigger id="editDegreeType">
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
                Promote a user-typed degree to master-typed to make it an official suggestion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedDegree(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending || !editDegreeName.trim()}
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
            <AlertDialogTitle>Delete Degree</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{selectedDegree?.name}&quot;</strong>?
              This action cannot be undone. Candidates who have this degree on their profile will
              retain it, but it will no longer appear in suggestions.
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

export default DegreesListPage;
