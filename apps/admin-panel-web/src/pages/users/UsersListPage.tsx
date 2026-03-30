import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
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
import type { IAdmin } from '@/types/index';
import { isDeletedUser, getEffectiveActiveStatus } from '@/lib/deletedUser';

interface AdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string;
  password?: string;
  confirmPassword?: string;
}

interface AdminApiResponse {
  data: {
    items: IAdmin[];
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

interface Company {
  id: string;
  name: string;
  slug: string;
}

const initialFormData: AdminFormData = {
  firstName: '',
  lastName: '',
  email: '',
  companyId: '',
  password: '',
  confirmPassword: '',
};

export default function UsersListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search input by 500ms
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [formData, setFormData] = useState<AdminFormData>(initialFormData);
  const [editingAdmin, setEditingAdmin] = useState<IAdmin | null>(null);

  // Fetch super employers list with pagination (uses debounced search to reduce API calls)
  const { data: adminsData, isLoading } = useQuery({
    queryKey: ['admins', page, limit, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        role: 'super_employer',
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      });
      const response = await http.get(`${endpoints.user.list}?${params}`);
      return response as unknown as AdminApiResponse;
    },
  });

  const admins: IAdmin[] = adminsData?.data?.items || [];
  const pagination = adminsData?.data?.pagination;
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = page < totalPages;

  // Fetch companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await http.get(endpoints.company.list);
      return response as unknown as { data: Company[] };
    },
  });

  const companies: Company[] = companiesData?.data || [];

  // Create admin mutation
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
    mutationFn: async (data: AdminFormData) => {
      // Use the new admin creation endpoint with company assignment
      return await http.post('/admin/users/admins', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Super employer created successfully and assigned to company');
      setIsCreateOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create super employer');
    },
  });

  // Update admin mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminFormData }) => {
      return await http.put(endpoints.user.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Super employer updated successfully');
      setIsEditOpen(false);
      setEditingAdmin(null);
      setFormData(initialFormData);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update super employer');
    },
  });

  // Delete admin mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.user.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Super employer deactivated successfully');
      setDeleteAdminId(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to deactivate super employer');
    },
  });

  // Throttled create handler - prevents double-click submissions (2 second delay)
  const handleCreate = useThrottle(() => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.companyId) {
      toast.error('Please select a company');
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
    // Role and company assignment handled by backend
    createMutation.mutate(formData);
  }, 2000);

  const handleEdit = (admin: IAdmin) => {
    setEditingAdmin(admin);
    setFormData({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
    });
    setIsEditOpen(true);
  };

  // Throttled update handler - prevents double-click submissions (2 second delay)
  const handleUpdate = useThrottle(() => {
    if (!editingAdmin) return;
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate({ id: editingAdmin.id, data: formData });
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
    setEditingAdmin(null);
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

  const activeAdmins = admins.filter((a: IAdmin) => a.isActive).length;
  const verifiedAdmins = admins.filter((a: IAdmin) => a.isVerified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Employer Management</h1>
          <p className="text-muted-foreground">Manage super employer accounts and permissions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Super Employer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Super Employer</DialogTitle>
              <DialogDescription>
                Add a new super employer account to the platform. The SUPER_EMPLOYER role will be
                automatically assigned.
              </DialogDescription>
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
              <div>
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@admin.com"
                />
              </div>
              <div>
                <Label htmlFor="company">
                  Company <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, companyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company to assign super employer" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.length === 0 ? (
                      <SelectItem value="no-companies" disabled>
                        No companies available
                      </SelectItem>
                    ) : (
                      companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Super employer will be scoped to this company
                </p>
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
                    placeholder="e.g., Admin@123"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Min 8 chars with uppercase, lowercase, number & special character
                  </p>
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
                  {createMutation.isPending ? 'Creating...' : 'Create Super Employer'}
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
            <CardTitle className="text-sm font-medium">Total Super Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Super Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Super Employers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedAdmins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search super employers by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Super Employers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Super Employers List</CardTitle>
          <CardDescription>View and manage all super employer accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading super employers...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No super employers found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin: IAdmin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          {admin.firstName} {admin.lastName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDeletedUser(admin.email) ? (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground italic">Deleted User</span>
                            <span
                              className="text-xs text-muted-foreground/60 truncate max-w-[200px]"
                              title={admin.email}
                            >
                              {admin.email}
                            </span>
                          </div>
                        ) : (
                          admin.email
                        )}
                      </TableCell>
                      <TableCell>{admin.employer?.company?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {getStatusBadge(getEffectiveActiveStatus(admin.email, admin.isActive))}
                      </TableCell>
                      <TableCell>{formatDate(admin.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                            disabled={isDeletedUser(admin.email)}
                            title={
                              isDeletedUser(admin.email)
                                ? 'Cannot edit deleted user'
                                : 'Edit super employer'
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAdminId(admin.id)}
                            disabled={isDeletedUser(admin.email)}
                            title={
                              isDeletedUser(admin.email)
                                ? 'User already deleted'
                                : 'Delete super employer'
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
                    super employers
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
            <DialogTitle>Edit Super Employer</DialogTitle>
            <DialogDescription>Update super employer account information</DialogDescription>
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
            <div>
              <Label htmlFor="edit-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john@admin.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Super Employer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAdminId} onOpenChange={() => setDeleteAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Super Employer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this super employer? This action will mark the
              super employer as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAdminId && handleDelete(deleteAdminId)}
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
