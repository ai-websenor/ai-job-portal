/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useThrottle } from '@/hooks/useThrottle';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import routePath from '@/routes/routePath';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { isDeletedUser, getEffectiveActiveStatus } from '@/lib/deletedUser';

interface CandidateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  skills?: string;
  experience?: string;
  password?: string;
  confirmPassword?: string;
}

interface Candidate {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  location?: string;
  skills?: string[];
  experience?: string;
  isActive: boolean;
  isVerified: boolean;
  status?: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface CandidateApiResponse {
  data: {
    items: Candidate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
  status: string;
  statusCode: number;
}

const initialFormData: CandidateFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  skills: '',
  experience: '',
  password: '',
  confirmPassword: '',
};

export default function CandidatesListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Redirect non-super_admin users
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      toast.error('Access denied. Only super admins can view candidates.');
      navigate(routePath.DASHBOARD, { replace: true });
    }
  }, [user, navigate]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search input by 500ms
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [formData, setFormData] = useState<CandidateFormData>(initialFormData);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Status toggle states
  const [statusToggleCandidate, setStatusToggleCandidate] = useState<Candidate | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Fetch candidates list with pagination (uses debounced search to reduce API calls)
  const {
    data: candidatesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'candidates',
      page,
      limit,
      debouncedSearchQuery,
      fromDate,
      toDate,
      statusFilter,
      sortOrder,
    ],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          role: 'candidate', // Filter by candidate role
          page: page.toString(),
          limit: limit.toString(),
          ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
          ...(fromDate && { fromDate }),
          ...(toDate && { toDate }),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          sortBy: 'createdAt',
          sortOrder,
        });
        const response = await http.get(`${endpoints.candidate.list}?${params}`);
        console.log('API Response:', response); // Debug log
        return response as unknown as CandidateApiResponse;
      } catch (err) {
        console.error('Error fetching candidates:', err);
        throw err;
      }
    },
  });

  const candidates: Candidate[] = candidatesData?.data?.items || [];
  const pagination = candidatesData?.data?.pagination;
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = page < totalPages;

  // Create candidate mutation
  const getErrorMessage = (error: unknown) => {
    if (!error) return undefined;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const msg = (error as { message?: unknown }).message;
      return typeof msg === 'string' ? msg : undefined;
    }
    return undefined;
  };

  const createMutation = useMutation({
    mutationFn: async (data: CandidateFormData) => {
      const payload = {
        ...data,
        role: 'candidate', // Ensure role is candidate
        skills: data.skills ? data.skills.split(',').map((s) => s.trim()) : [],
      };
      return await http.post(endpoints.candidate.create, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate created successfully');
      setIsCreateOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create candidate');
    },
  });

  // Update candidate mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CandidateFormData }) => {
      const payload = {
        ...data,
        skills: data.skills ? data.skills.split(',').map((s) => s.trim()) : [],
      };
      return await http.put(endpoints.candidate.update(id), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate updated successfully');
      setIsEditOpen(false);
      setEditingCandidate(null);
      setFormData(initialFormData);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update candidate');
    },
  });

  // Delete candidate mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.candidate.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidate deactivated successfully');
      setDeleteCandidateId(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to deactivate candidate');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' }) => {
      return await http.put(endpoints.user.updateStatus(id), { status });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      const action = variables.status === 'active' ? 'activated' : 'suspended';
      toast.success(`Candidate ${action} successfully`);
      setIsStatusDialogOpen(false);
      setStatusToggleCandidate(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update candidate status');
    },
  });

  // Throttled create handler - prevents double-click submissions (2 second delay)
  const handleCreate = useThrottle(() => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    createMutation.mutate(formData);
  }, 2000);

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone || candidate.mobile || '',
      location: candidate.location || '',
      skills: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : '',
      experience: candidate.experience || '',
    });
    setIsEditOpen(true);
  };

  // Throttled update handler - prevents double-click submissions (2 second delay)
  const handleUpdate = useThrottle(() => {
    if (!editingCandidate) return;
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate({ id: editingCandidate.id, data: formData });
  }, 2000);

  // Throttled delete handler - prevents accidental double-clicks (2 second delay)
  const handleDelete = useThrottle((id: string) => {
    deleteMutation.mutate(id);
  }, 2000);

  // Handle status badge click
  const handleStatusClick = (candidate: Candidate) => {
    // Don't allow status toggle for deleted users
    if (isDeletedUser(candidate.email)) {
      return;
    }
    setStatusToggleCandidate(candidate);
    setIsStatusDialogOpen(true);
  };

  // Handle status toggle confirmation
  const handleStatusToggle = () => {
    if (!statusToggleCandidate) return;
    const newStatus = statusToggleCandidate.isActive ? 'suspended' : 'active';
    toggleStatusMutation.mutate({ id: statusToggleCandidate.id, status: newStatus });
  };

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setFormData(initialFormData);
  };

  const handleCloseEditDialog = () => {
    setIsEditOpen(false);
    setEditingCandidate(null);
    setFormData(initialFormData);
  };

  const getStatusBadge = (candidate: Candidate) => {
    const isDeleted = isDeletedUser(candidate.email);
    const isActive = getEffectiveActiveStatus(candidate.email, candidate.isActive);

    // Deleted users - red badge, non-clickable
    if (isDeleted) {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Deleted
        </Badge>
      );
    }

    // Active users - green badge, clickable
    if (isActive) {
      return (
        <Badge
          className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-1 w-fit cursor-pointer transition-colors"
          onClick={() => handleStatusClick(candidate)}
        >
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    }

    // Suspended users - gray badge, clickable
    return (
      <Badge
        className="bg-gray-100 text-gray-800 hover:bg-gray-200 flex items-center gap-1 w-fit cursor-pointer transition-colors"
        onClick={() => handleStatusClick(candidate)}
      >
        <XCircle className="h-3 w-3" />
        Suspended
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

  const activeCandidates = candidates.filter((c: Candidate) => c?.isActive === true).length;
  const verifiedCandidates = candidates.filter((c: Candidate) => c?.isVerified === true).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidates Management</h1>
          <p className="text-muted-foreground">Manage candidate profiles and applications</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Candidate</DialogTitle>
              <DialogDescription>Add a new candidate profile to the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Mumbai, India"
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Experience</Label>
                  <Input
                    id="experience"
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, experience: e.target.value }))
                    }
                    placeholder="3 years"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData((prev) => ({ ...prev, skills: e.target.value }))}
                  placeholder="JavaScript, React, Node.js"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    placeholder="Confirm password"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Candidate'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCandidates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCandidates}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates by name, email, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="fromDate" className="text-sm mb-2 block">
                  From Date
                </Label>
                <div className="relative">
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPage(1);
                    }}
                    className="pr-10 cursor-pointer"
                    onClick={(e) => {
                      const input = e.currentTarget;
                      if (input.showPicker) {
                        input.showPicker();
                      }
                    }}
                  />
                  {fromDate && (
                    <button
                      onClick={() => {
                        setFromDate('');
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="toDate" className="text-sm mb-2 block">
                  To Date
                </Label>
                <div className="relative">
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setPage(1);
                    }}
                    className="pr-10 cursor-pointer"
                    onClick={(e) => {
                      const input = e.currentTarget;
                      if (input.showPicker) {
                        input.showPicker();
                      }
                    }}
                  />
                  {toDate && (
                    <button
                      onClick={() => {
                        setToDate('');
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-sm mb-2 block">
                  Status
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sortOrder" className="text-sm mb-2 block">
                  Created At
                </Label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: 'asc' | 'desc') => {
                    setSortOrder(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="sortOrder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Newest First
                      </div>
                    </SelectItem>
                    <SelectItem value="asc">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Oldest First
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Candidates List</CardTitle>
          <CardDescription>View and manage all candidate profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-500 font-semibold">Error loading candidates</p>
              <p className="text-muted-foreground text-sm mt-2">
                {error instanceof Error
                  ? error.message
                  : typeof error === 'object' && error !== null && 'message' in error
                    ? Array.isArray((error as any).message)
                      ? (error as any).message.join(', ')
                      : (error as any).message
                    : 'Failed to fetch candidates'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No candidates found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate: Candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {candidate.firstName} {candidate.lastName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDeletedUser(candidate.email) ? (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground italic">Deleted User</span>
                            <span
                              className="text-xs text-muted-foreground/60 truncate max-w-[200px]"
                              title={candidate.email}
                            >
                              {candidate.email}
                            </span>
                          </div>
                        ) : (
                          candidate.email
                        )}
                      </TableCell>
                      <TableCell>{candidate.phone || candidate.mobile || 'N/A'}</TableCell>
                      <TableCell>{candidate.location || 'N/A'}</TableCell>
                      <TableCell>{candidate.experience || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(candidate)}</TableCell>
                      <TableCell>{formatDate(candidate.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(candidate)}
                            disabled={isDeletedUser(candidate.email)}
                            title={
                              isDeletedUser(candidate.email)
                                ? 'Cannot edit deleted user'
                                : 'Edit candidate'
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCandidateId(candidate.id)}
                            disabled={isDeletedUser(candidate.email)}
                            title={
                              isDeletedUser(candidate.email)
                                ? 'User already deleted'
                                : 'Delete candidate'
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                    candidates
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>Update candidate profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Mumbai, India"
                />
              </div>
              <div>
                <Label htmlFor="edit-experience">Experience</Label>
                <Input
                  id="edit-experience"
                  value={formData.experience}
                  onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
                  placeholder="3 years"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-skills">Skills (comma-separated)</Label>
              <Input
                id="edit-skills"
                value={formData.skills}
                onChange={(e) => setFormData((prev) => ({ ...prev, skills: e.target.value }))}
                placeholder="JavaScript, React, Node.js"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Candidate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCandidateId} onOpenChange={() => setDeleteCandidateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this candidate? This action will mark the
              candidate as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCandidateId && handleDelete(deleteCandidateId)}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToggleCandidate?.isActive ? 'Suspend Candidate?' : 'Activate Candidate?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusToggleCandidate?.isActive ? (
                <>
                  Are you sure you want to suspend{' '}
                  <strong>
                    {statusToggleCandidate.firstName} {statusToggleCandidate.lastName}
                  </strong>
                  ?<br />
                  The candidate will not be able to login until reactivated.
                </>
              ) : (
                <>
                  Are you sure you want to activate{' '}
                  <strong>
                    {statusToggleCandidate?.firstName} {statusToggleCandidate?.lastName}
                  </strong>
                  ?<br />
                  The candidate will be able to login again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusToggle}
              className={
                statusToggleCandidate?.isActive
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-green-500 hover:bg-green-600'
              }
            >
              {toggleStatusMutation.isPending
                ? statusToggleCandidate?.isActive
                  ? 'Suspending...'
                  : 'Activating...'
                : statusToggleCandidate?.isActive
                  ? 'Suspend'
                  : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
