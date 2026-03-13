import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useThrottle } from '@/hooks/useThrottle';
import { toast } from 'sonner';
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
import type { IEmployer } from '@/types/index';
import { isDeletedUser, getEffectiveActiveStatus } from '@/lib/deletedUser';

interface EmployerFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  designation?: string;
  department?: string;
  password?: string;
  confirmPassword?: string;
}

interface EmployerApiResponse {
  data: IEmployer[];
  pagination: {
    totalEmployers: number;
    pageCount: number;
    hasNextPage: boolean;
  };
}

const initialFormData: EmployerFormData = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  designation: '',
  department: '',
  password: '',
  confirmPassword: '',
};

export default function EmployersListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteEmployerId, setDeleteEmployerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search input by 500ms
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [formData, setFormData] = useState<EmployerFormData>(initialFormData);
  const [editingEmployer, setEditingEmployer] = useState<IEmployer | null>(null);

  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch employers list with pagination (uses debounced search to reduce API calls)
  const { data: employersData, isLoading } = useQuery({
    queryKey: [
      'employers',
      page,
      limit,
      debouncedSearchQuery,
      fromDate,
      toDate,
      statusFilter,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sortBy: 'createdAt',
        sortOrder,
      });
      const response = await http.get(`${endpoints.employer.list}?${params}`);
      return response as unknown as EmployerApiResponse;
    },
  });

  const employers: IEmployer[] = employersData?.data || [];
  const pagination = employersData?.pagination;
  const total = pagination?.totalEmployers || 0;
  const totalPages = pagination?.pageCount || 1;
  const hasNextPage = pagination?.hasNextPage || false;

  // Create employer mutation
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
    mutationFn: async (data: EmployerFormData) => {
      return await http.post(endpoints.employer.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast.success('Employer created successfully');
      setIsCreateOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create employer');
    },
  });

  // Update employer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployerFormData }) => {
      return await http.put(endpoints.employer.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast.success('Employer updated successfully');
      setIsEditOpen(false);
      setEditingEmployer(null);
      setFormData(initialFormData);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update employer');
    },
  });

  // Delete employer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.employer.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast.success('Employer deactivated successfully');
      setDeleteEmployerId(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to deactivate employer');
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

  const handleEdit = (employer: IEmployer) => {
    setEditingEmployer(employer);
    setFormData({
      firstName: employer.firstName,
      lastName: employer.lastName,
      email: employer.email,
      mobile: employer.mobile || '',
      designation: employer.designation || '',
      department: employer.department || '',
    });
    setIsEditOpen(true);
  };

  // Throttled update handler - prevents double-click submissions (2 second delay)
  const handleUpdate = useThrottle(() => {
    if (!editingEmployer) return;
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate({ id: editingEmployer.id, data: formData });
  }, 2000);

  // Throttled delete handler - prevents accidental double-clicks (2 second delay)
  const handleDelete = useThrottle((id: string) => {
    deleteMutation.mutate(id);
  }, 2000);

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setFormData(initialFormData);
  };

  const handleCloseEditDialog = () => {
    setIsEditOpen(false);
    setEditingEmployer(null);
    setFormData(initialFormData);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Inactive
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

  const activeEmployers = employers.filter((e: IEmployer) => e.isActive).length;
  const verifiedEmployers = employers.filter((e: IEmployer) => e.isVerified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employers Management</h1>
          <p className="text-muted-foreground">Manage employer accounts and company information</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Employer</DialogTitle>
              <DialogDescription>Add a new employer account to the platform</DialogDescription>
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
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, designation: e.target.value }))
                    }
                    placeholder="HR Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="Human Resources"
                  />
                </div>
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
                  {createMutation.isPending ? 'Creating...' : 'Create Employer'}
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
            <CardTitle className="text-sm font-medium">Total Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedEmployers}</div>
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
                  placeholder="Search employers by name, email..."
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
                    <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* Employers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employers List</CardTitle>
          <CardDescription>View and manage all employer accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading employers...</p>
            </div>
          ) : employers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employers found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employers.map((employer: IEmployer) => (
                    <TableRow key={employer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {employer.firstName} {employer.lastName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDeletedUser(employer.email) ? (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground italic">Deleted User</span>
                            <span
                              className="text-xs text-muted-foreground/60 truncate max-w-[200px]"
                              title={employer.email}
                            >
                              {employer.email}
                            </span>
                          </div>
                        ) : (
                          employer.email
                        )}
                      </TableCell>
                      <TableCell>{employer.mobile || 'N/A'}</TableCell>
                      <TableCell>{employer.designation || 'N/A'}</TableCell>
                      <TableCell>{employer.department || 'N/A'}</TableCell>
                      <TableCell>
                        {getStatusBadge(
                          getEffectiveActiveStatus(employer.email, employer.isActive),
                        )}
                      </TableCell>
                      <TableCell>{formatDate(employer.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employer)}
                            disabled={isDeletedUser(employer.email)}
                            title={
                              isDeletedUser(employer.email)
                                ? 'Cannot edit deleted user'
                                : 'Edit employer'
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteEmployerId(employer.id)}
                            disabled={isDeletedUser(employer.email)}
                            title={
                              isDeletedUser(employer.email)
                                ? 'User already deleted'
                                : 'Delete employer'
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
                    employers
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
            <DialogTitle>Edit Employer</DialogTitle>
            <DialogDescription>Update employer account information</DialogDescription>
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
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, designation: e.target.value }))
                  }
                  placeholder="HR Manager"
                />
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="Human Resources"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Employer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEmployerId} onOpenChange={() => setDeleteEmployerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this employer? This action will mark the employer
              as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEmployerId && handleDelete(deleteEmployerId)}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
