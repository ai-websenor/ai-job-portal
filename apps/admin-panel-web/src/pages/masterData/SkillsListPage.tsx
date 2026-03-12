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
  Zap,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { ISkill, SkillType } from '@/types';

interface SkillsResponse {
  data: ISkill[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const SkillsListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState<'all' | SkillType>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<ISkill | null>(null);

  // Form state
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('technical');
  const [editSkillName, setEditSkillName] = useState('');
  const [editSkillType, setEditSkillType] = useState<SkillType>('master-typed');
  const [editSkillCategory, setEditSkillCategory] = useState('technical');

  const SKILL_CATEGORIES = [
    { value: 'technical', label: 'Technical' },
    { value: 'soft', label: 'Soft Skill' },
    { value: 'language', label: 'Language' },
    { value: 'industry_specific', label: 'Industry Specific' },
  ];

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch skills
  const { data, isLoading, error } = useQuery({
    queryKey: ['skills', page, limit, debouncedSearch, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const response = await http.get(`${endpoints.skills.list}?${params}`);
      return response as unknown as SkillsResponse;
    },
  });

  // Create mutation (always master-typed when admin adds)
  const createMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: string }) => {
      return await http.post(endpoints.skills.create, {
        name: name.trim(),
        category,
        type: 'master-typed' as SkillType,
      });
    },
    onSuccess: () => {
      setPage(1);
      queryClient.refetchQueries({ queryKey: ['skills'] });
      toast.success('Skill added successfully');
      setAddDialogOpen(false);
      setSkillName('');
      setSkillCategory('technical');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to add skill';
      toast.error(msg);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      type,
      category,
    }: {
      id: string;
      name: string;
      type: SkillType;
      category: string;
    }) => {
      return await http.put(endpoints.skills.update(id), { name, type, category });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['skills'] });
      toast.success('Skill updated successfully');
      setEditDialogOpen(false);
      setSelectedSkill(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update skill';
      toast.error(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.skills.delete(id));
    },
    onSuccess: (response: any) => {
      queryClient.refetchQueries({ queryKey: ['skills'] });
      if (response?.data?.softDeleted) {
        toast.warning(response?.message || 'Skill deactivated — it is used by existing profiles.');
      } else {
        toast.success('Skill deleted successfully');
      }
      setDeleteDialogOpen(false);
      setSelectedSkill(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to delete skill';
      toast.error(msg);
    },
  });

  const handleAddSubmit = () => {
    if (!skillName.trim()) {
      toast.error('Skill name is required');
      return;
    }
    createMutation.mutate({ name: skillName, category: skillCategory });
  };

  const handleEditOpen = (skill: ISkill) => {
    setSelectedSkill(skill);
    setEditSkillName(skill.name);
    setEditSkillType(skill.type);
    setEditSkillCategory(skill.category ?? 'technical');
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editSkillName.trim()) {
      toast.error('Skill name is required');
      return;
    }
    if (!selectedSkill) return;
    updateMutation.mutate({
      id: selectedSkill.id,
      name: editSkillName.trim(),
      type: editSkillType,
      category: editSkillCategory,
    });
  };

  const handleDeleteOpen = (skill: ISkill) => {
    setSelectedSkill(skill);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedSkill) return;
    deleteMutation.mutate(selectedSkill.id);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as 'all' | SkillType);
    setPage(1);
  };

  const getTypeBadge = (type: SkillType) => {
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

  const skills = data?.data || [];
  const totalSkills = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || 1;

  const masterCount = skills.filter((s) => s.type === 'master-typed').length;
  const userCount = skills.filter((s) => s.type === 'user-typed').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground mt-2">
            Manage master skill list used across the platform
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Skills</p>
                <p className="text-2xl font-bold">{totalSkills}</p>
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
                <p className="text-sm text-muted-foreground">Master Skills</p>
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
                placeholder="Search skills..."
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
                <SelectItem value="master-typed">Master Skills</SelectItem>
                <SelectItem value="user-typed">User Typed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Skills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Skills List</CardTitle>
          <CardDescription>
            {totalSkills} skill{totalSkills !== 1 ? 's' : ''} total
            {typeFilter !== 'all' &&
              ` (filtered by ${typeFilter === 'master-typed' ? 'master' : 'user typed'})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading skills...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load skills. Please try again.
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No skills found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add skills to get started'}
              </p>
              {!search && typeFilter === 'all' && (
                <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Skill
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Skill Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((skill, index) => (
                    <TableRow key={skill.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{skill.name}</TableCell>
                      <TableCell>{getTypeBadge(skill.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(skill.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(skill)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOpen(skill)}
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
                    Page {currentPage} of {totalPages} &mdash; {totalSkills} total
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

      {/* Add Skill Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
            <DialogDescription>
              Add a skill to the master list. Skills added here are marked as{' '}
              <strong>master-typed</strong> and available to all candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skillName">
                Skill Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="skillName"
                placeholder="e.g. JavaScript, Project Management, Adobe Photoshop"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubmit();
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skillCategory">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={skillCategory} onValueChange={setSkillCategory}>
                <SelectTrigger id="skillCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                This skill will be tagged as <strong>master-typed</strong> and visible in candidate
                skill suggestions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setSkillName('');
                setSkillCategory('technical');
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={createMutation.isPending || !skillName.trim()}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Skill Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>Update the skill name or change its type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editSkillName">
                Skill Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editSkillName"
                placeholder="e.g. JavaScript"
                value={editSkillName}
                onChange={(e) => setEditSkillName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSkillCategory">Category</Label>
              <Select value={editSkillCategory} onValueChange={setEditSkillCategory}>
                <SelectTrigger id="editSkillCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSkillType">Skill Type</Label>
              <Select
                value={editSkillType}
                onValueChange={(val) => setEditSkillType(val as SkillType)}
              >
                <SelectTrigger id="editSkillType">
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
                Promote a user-typed skill to master-typed to make it an official suggestion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedSkill(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending || !editSkillName.trim()}
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
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{selectedSkill?.name}&quot;</strong>?
              This action cannot be undone. Candidates who have this skill on their profile will
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

export default SkillsListPage;
