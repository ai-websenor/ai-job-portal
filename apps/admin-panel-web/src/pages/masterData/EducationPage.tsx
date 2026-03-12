/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IMasterDegree, IMasterFieldOfStudy, EducationLevel, MasterDataType } from '@/types';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: 'high_school', label: 'High School' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'phd', label: 'PhD' },
];

const LEVEL_COLORS: Record<EducationLevel, string> = {
  high_school: 'bg-gray-100 text-gray-700',
  diploma: 'bg-yellow-100 text-yellow-700',
  certificate: 'bg-blue-100 text-blue-700',
  bachelors: 'bg-green-100 text-green-700',
  masters: 'bg-purple-100 text-purple-700',
  phd: 'bg-red-100 text-red-700',
};

const getLevelLabel = (level: EducationLevel) =>
  EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level;

export default function EducationPage() {
  const queryClient = useQueryClient();

  // ---- Degrees state ----
  const [degreePage, setDegreePage] = useState(1);
  const [degreeSearch, setDegreeSearch] = useState('');
  const [degreeLevelFilter, setDegreeLevelFilter] = useState<string>('all');
  const [degreeTypeFilter, setDegreeTypeFilter] = useState<'all' | MasterDataType>('all');
  const debouncedDegreeSearch = useDebounce(degreeSearch, 500);

  const [selectedDegree, setSelectedDegree] = useState<IMasterDegree | null>(null);

  const [addDegreeOpen, setAddDegreeOpen] = useState(false);
  const [newDegreeName, setNewDegreeName] = useState('');
  const [newDegreeLevel, setNewDegreeLevel] = useState<EducationLevel>('bachelors');

  const [editDegreeOpen, setEditDegreeOpen] = useState(false);
  const [editDegree, setEditDegree] = useState<IMasterDegree | null>(null);
  const [editDegreeName, setEditDegreeName] = useState('');
  const [editDegreeLevel, setEditDegreeLevel] = useState<EducationLevel>('bachelors');
  const [editDegreeType, setEditDegreeType] = useState<MasterDataType>('master-typed');

  const [deleteDegreeId, setDeleteDegreeId] = useState<string | null>(null);

  // ---- Fields of Study state ----
  const [fosPage, setFosPage] = useState(1);
  const [fosSearch, setFosSearch] = useState('');
  const [fosTypeFilter, setFosTypeFilter] = useState<'all' | MasterDataType>('all');
  const debouncedFosSearch = useDebounce(fosSearch, 500);

  const [addFosOpen, setAddFosOpen] = useState(false);
  const [newFosName, setNewFosName] = useState('');

  const [editFosOpen, setEditFosOpen] = useState(false);
  const [editFos, setEditFos] = useState<IMasterFieldOfStudy | null>(null);
  const [editFosName, setEditFosName] = useState('');
  const [editFosType, setEditFosType] = useState<MasterDataType>('master-typed');

  const [deleteFosId, setDeleteFosId] = useState<string | null>(null);

  // Reset page when search changes
  useEffect(() => {
    setDegreePage(1);
  }, [debouncedDegreeSearch]);
  useEffect(() => {
    setFosPage(1);
  }, [debouncedFosSearch]);

  // ---- Queries ----
  const { data: degreesData, isLoading: degreesLoading } = useQuery({
    queryKey: ['degrees', degreePage, debouncedDegreeSearch, degreeLevelFilter, degreeTypeFilter],
    queryFn: async () => {
      const params: Record<string, any> = { page: degreePage, limit: 15 };
      if (debouncedDegreeSearch) params.search = debouncedDegreeSearch;
      if (degreeLevelFilter !== 'all') params.level = degreeLevelFilter;
      if (degreeTypeFilter !== 'all') params.type = degreeTypeFilter;
      const res = await http.get(endpoints.degrees.list, { params });
      return res as unknown as PaginatedResponse<IMasterDegree>;
    },
  });

  const { data: fosData, isLoading: fosLoading } = useQuery({
    queryKey: ['fields-of-study', selectedDegree?.id, fosPage, debouncedFosSearch, fosTypeFilter],
    queryFn: async () => {
      if (!selectedDegree) return null;
      const params: Record<string, any> = { page: fosPage, limit: 15 };
      if (debouncedFosSearch) params.search = debouncedFosSearch;
      if (fosTypeFilter !== 'all') params.type = fosTypeFilter;
      const res = await http.get(endpoints.degrees.fieldsOfStudy(selectedDegree.id), { params });
      return res as unknown as PaginatedResponse<IMasterFieldOfStudy>;
    },
    enabled: !!selectedDegree,
  });

  // ---- Degree mutations ----
  const createDegreeMutation = useMutation({
    mutationFn: (data: { name: string; level: EducationLevel }) =>
      http.post(endpoints.degrees.create, data),
    onSuccess: () => {
      toast.success('Degree created successfully');
      queryClient.refetchQueries({ queryKey: ['degrees'] });
      setAddDegreeOpen(false);
      setNewDegreeName('');
      setNewDegreeLevel('bachelors');
      setDegreePage(1);
    },
    onError: () => toast.error('Failed to create degree'),
  });

  const updateDegreeMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; level?: EducationLevel; type?: MasterDataType };
    }) => http.put(endpoints.degrees.update(id), data),
    onSuccess: () => {
      toast.success('Degree updated successfully');
      queryClient.refetchQueries({ queryKey: ['degrees'] });
      setEditDegreeOpen(false);
      setEditDegree(null);
    },
    onError: () => toast.error('Failed to update degree'),
  });

  const deleteDegreeMutation = useMutation({
    mutationFn: (id: string) => http.delete(endpoints.degrees.delete(id)),
    onSuccess: (response: any) => {
      const softDeleted = response?.softDeleted ?? response?.data?.softDeleted;
      const message = response?.message ?? response?.data?.message;
      if (softDeleted) {
        toast.warning(message || 'Degree deactivated (has linked fields of study)');
      } else {
        toast.success('Degree deleted successfully');
      }
      queryClient.refetchQueries({ queryKey: ['degrees'] });
      if (selectedDegree?.id === deleteDegreeId) setSelectedDegree(null);
      setDeleteDegreeId(null);
    },
    onError: () => toast.error('Failed to delete degree'),
  });

  // ---- Field of Study mutations ----
  const createFosMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      http.post(endpoints.fieldsOfStudy.create(selectedDegree!.id), data),
    onSuccess: () => {
      toast.success('Field of study created successfully');
      queryClient.refetchQueries({ queryKey: ['fields-of-study'] });
      setAddFosOpen(false);
      setNewFosName('');
      setFosPage(1);
    },
    onError: () => toast.error('Failed to create field of study'),
  });

  const updateFosMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; type?: MasterDataType } }) =>
      http.put(endpoints.fieldsOfStudy.update(id), data),
    onSuccess: () => {
      toast.success('Field of study updated successfully');
      queryClient.refetchQueries({ queryKey: ['fields-of-study'] });
      setEditFosOpen(false);
      setEditFos(null);
    },
    onError: () => toast.error('Failed to update field of study'),
  });

  const deleteFosMutation = useMutation({
    mutationFn: (id: string) => http.delete(endpoints.fieldsOfStudy.delete(id)),
    onSuccess: () => {
      toast.success('Field of study deleted successfully');
      queryClient.refetchQueries({ queryKey: ['fields-of-study'] });
      setDeleteFosId(null);
    },
    onError: () => toast.error('Failed to delete field of study'),
  });

  // ---- Handlers ----
  const openEditDegree = (degree: IMasterDegree) => {
    setEditDegree(degree);
    setEditDegreeName(degree.name);
    setEditDegreeLevel(degree.level);
    setEditDegreeType(degree.type);
    setEditDegreeOpen(true);
  };

  const openEditFos = (fos: IMasterFieldOfStudy) => {
    setEditFos(fos);
    setEditFosName(fos.name);
    setEditFosType(fos.type);
    setEditFosOpen(true);
  };

  const degrees = degreesData?.data ?? [];
  const degreeMeta = degreesData?.meta;
  const fosList = fosData?.data ?? [];
  const fosMeta = fosData?.meta;

  // Helper function to render type badge
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Education Master Data
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage degree programs and their associated fields of study.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Degrees Panel ---- */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Degrees
                {degreeMeta && <Badge variant="secondary">{degreeMeta.total}</Badge>}
              </CardTitle>
              <Button size="sm" onClick={() => setAddDegreeOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Degree
              </Button>
            </div>

            {/* Degree filters */}
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search degrees..."
                  value={degreeSearch}
                  onChange={(e) => setDegreeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={degreeTypeFilter}
                onValueChange={(v) => {
                  setDegreeTypeFilter(v as 'all' | MasterDataType);
                  setDegreePage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="master-typed">Master</SelectItem>
                  <SelectItem value="user-typed">User Typed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={degreeLevelFilter}
                onValueChange={(v) => {
                  setDegreeLevelFilter(v);
                  setDegreePage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Degree Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {degreesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : degrees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No degrees found. Add your first degree.
                    </TableCell>
                  </TableRow>
                ) : (
                  degrees.map((degree, idx) => (
                    <TableRow
                      key={degree.id}
                      className={`cursor-pointer transition-colors ${
                        selectedDegree?.id === degree.id ? 'bg-accent' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedDegree(degree);
                        setFosSearch('');
                        setFosPage(1);
                      }}
                    >
                      <TableCell className="text-muted-foreground">
                        {(degreePage - 1) * 15 + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {degree.name}
                          {selectedDegree?.id === degree.id && (
                            <ChevronRight className="h-3 w-3 text-primary ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[degree.level]}`}
                        >
                          {getLevelLabel(degree.level)}
                        </span>
                      </TableCell>
                      <TableCell>{getTypeBadge(degree.type)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDegree(degree)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDegreeId(degree.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Degree Pagination */}
            {degreeMeta && degreeMeta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {degreeMeta.page} of {degreeMeta.totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={degreePage <= 1}
                    onClick={() => setDegreePage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={degreePage >= degreeMeta.totalPages}
                    onClick={() => setDegreePage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Fields of Study Panel ---- */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Fields of Study
                {selectedDegree && fosMeta && <Badge variant="secondary">{fosMeta.total}</Badge>}
              </CardTitle>
              {selectedDegree && (
                <Button size="sm" onClick={() => setAddFosOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              )}
            </div>

            {selectedDegree ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Showing fields for:</span>
                <span className="text-sm font-medium text-primary">{selectedDegree.name}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[selectedDegree.level]}`}
                >
                  {getLevelLabel(selectedDegree.level)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                Select a degree from the left to view its fields of study.
              </p>
            )}

            {selectedDegree && (
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fields of study..."
                    value={fosSearch}
                    onChange={(e) => setFosSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={fosTypeFilter}
                  onValueChange={(v) => {
                    setFosTypeFilter(v as 'all' | MasterDataType);
                    setFosPage(1);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="master-typed">Master</SelectItem>
                    <SelectItem value="user-typed">User Typed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {!selectedDegree ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No degree selected</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Field of Study</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fosLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : fosList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No fields of study yet. Add one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fosList.map((fos, idx) => (
                        <TableRow key={fos.id}>
                          <TableCell className="text-muted-foreground">
                            {(fosPage - 1) * 15 + idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{fos.name}</TableCell>
                          <TableCell>{getTypeBadge(fos.type)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditFos(fos)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteFosId(fos.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* FoS Pagination */}
                {fosMeta && fosMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-muted-foreground">
                      Page {fosMeta.page} of {fosMeta.totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={fosPage <= 1}
                        onClick={() => setFosPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={fosPage >= fosMeta.totalPages}
                        onClick={() => setFosPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Add Degree Dialog ---- */}
      <Dialog open={addDegreeOpen} onOpenChange={setAddDegreeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Degree</DialogTitle>
            <DialogDescription>Create a new degree program in the master list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Degree Name</Label>
              <Input
                placeholder="e.g. Bachelor of Technology"
                value={newDegreeName}
                onChange={(e) => setNewDegreeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select
                value={newDegreeLevel}
                onValueChange={(v) => setNewDegreeLevel(v as EducationLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDegreeOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newDegreeName.trim() || createDegreeMutation.isPending}
              onClick={() =>
                createDegreeMutation.mutate({ name: newDegreeName, level: newDegreeLevel })
              }
            >
              {createDegreeMutation.isPending ? 'Adding...' : 'Add Degree'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Degree Dialog ---- */}
      <Dialog open={editDegreeOpen} onOpenChange={setEditDegreeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Degree</DialogTitle>
            <DialogDescription>Update the degree name, level, or type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Degree Name</Label>
              <Input value={editDegreeName} onChange={(e) => setEditDegreeName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select
                value={editDegreeLevel}
                onValueChange={(v) => setEditDegreeLevel(v as EducationLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editDegreeType}
                onValueChange={(v) => setEditDegreeType(v as MasterDataType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master-typed">Master Typed</SelectItem>
                  <SelectItem value="user-typed">User Typed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDegreeOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editDegreeName.trim() || updateDegreeMutation.isPending}
              onClick={() =>
                editDegree &&
                updateDegreeMutation.mutate({
                  id: editDegree.id,
                  data: { name: editDegreeName, level: editDegreeLevel, type: editDegreeType },
                })
              }
            >
              {updateDegreeMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Degree Confirm ---- */}
      <AlertDialog open={!!deleteDegreeId} onOpenChange={(o) => !o && setDeleteDegreeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Degree?</AlertDialogTitle>
            <AlertDialogDescription>
              If this degree has linked fields of study, it will be deactivated instead of
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDegreeId && deleteDegreeMutation.mutate(deleteDegreeId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Add Field of Study Dialog ---- */}
      <Dialog open={addFosOpen} onOpenChange={setAddFosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Field of Study</DialogTitle>
            <DialogDescription>
              Add a new field of study under{' '}
              <span className="font-semibold">{selectedDegree?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Field Name</Label>
            <Input
              placeholder="e.g. Computer Science"
              value={newFosName}
              onChange={(e) => setNewFosName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFosOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newFosName.trim() || createFosMutation.isPending}
              onClick={() => createFosMutation.mutate({ name: newFosName })}
            >
              {createFosMutation.isPending ? 'Adding...' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Field of Study Dialog ---- */}
      <Dialog open={editFosOpen} onOpenChange={setEditFosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Field of Study</DialogTitle>
            <DialogDescription>Update the field of study name or type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input value={editFosName} onChange={(e) => setEditFosName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editFosType}
                onValueChange={(v) => setEditFosType(v as MasterDataType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master-typed">Master Typed</SelectItem>
                  <SelectItem value="user-typed">User Typed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFosOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editFosName.trim() || updateFosMutation.isPending}
              onClick={() =>
                editFos &&
                updateFosMutation.mutate({
                  id: editFos.id,
                  data: { name: editFosName, type: editFosType },
                })
              }
            >
              {updateFosMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Field of Study Confirm ---- */}
      <AlertDialog open={!!deleteFosId} onOpenChange={(o) => !o && setDeleteFosId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field of Study?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the field of study. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteFosId && deleteFosMutation.mutate(deleteFosId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
