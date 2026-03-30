import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import routePath from '@/routes/routePath';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IEmployer } from '@/types/index';

interface EditFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  designation: string;
  department: string;
  isActive: boolean;
  isVerified: boolean;
}

export default function EmployerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    designation: '',
    department: '',
    isActive: true,
    isVerified: false,
  });

  // Fetch employer details
  const { data: employer, isLoading } = useQuery<IEmployer>({
    queryKey: ['employer', id],
    queryFn: async () => {
      const response = await http.get(endpoints.employer.details(id!));
      const employerData = (response.data || response) as IEmployer;
      if (employerData) {
        setEditForm({
          firstName: employerData.firstName || '',
          lastName: employerData.lastName || '',
          email: employerData.email || '',
          mobile: employerData.mobile || '',
          designation: employerData.designation || '',
          department: employerData.department || '',
          isActive: employerData.isActive ?? true,
          isVerified: employerData.isVerified ?? false,
        });
      }
      return employerData;
    },
    enabled: !!id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<EditFormData>) => {
      return await http.put(endpoints.employer.update(id!), data);
    },
    onSuccess: () => {
      toast.success('Employer updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employer', id] });
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      setIsEditOpen(false);
    },
    onError: (error: unknown) => {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Failed to update employer';
      toast.error(msg);
    },
  });

  // Deactivate mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await http.delete(endpoints.employer.delete(id!));
    },
    onSuccess: () => {
      toast.success('Employer deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      navigate(routePath.MEMBER.EMPLOYERS);
    },
    onError: (error: unknown) => {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Failed to deactivate employer';
      toast.error(msg);
    },
  });

  const handleUpdate = () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate(editForm);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Employer not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(routePath.MEMBER.EMPLOYERS)}
            >
              Back to Employers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(routePath.MEMBER.EMPLOYERS)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Employer Details</h1>
            <p className="text-muted-foreground">View and manage employer account</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate Employer</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to deactivate "{employer.firstName} {employer.lastName}"?
                  This will mark the employer as inactive and invalidate their sessions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground"
                >
                  {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-muted-foreground">
                {employer.firstName?.[0]?.toUpperCase()}
                {employer.lastName?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {employer.firstName} {employer.lastName}
                  </h2>
                  {employer.designation && (
                    <p className="text-muted-foreground mt-1">{employer.designation}</p>
                  )}
                  {employer.department && (
                    <p className="text-sm text-muted-foreground">{employer.department}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {employer.isVerified && (
                    <Badge className="bg-blue-100 text-blue-800 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {employer.isActive ? (
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{employer.email}</span>
                </div>
                {employer.mobile && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employer.mobile}</span>
                  </div>
                )}
                {employer.company?.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{employer.company.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">First Name</span>
              <span className="text-sm font-medium">{employer.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Name</span>
              <span className="text-sm font-medium">{employer.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{employer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Mobile</span>
              <span className="text-sm font-medium">{employer.mobile || '—'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Designation</span>
              <span className="text-sm font-medium">{employer.designation || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Department</span>
              <span className="text-sm font-medium">{employer.department || '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {employer.company ? (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Company Name</span>
                  <span className="text-sm font-medium">{employer.company.name}</span>
                </div>
                {employer.company.industry && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Industry</span>
                    <span className="text-sm font-medium">{employer.company.industry}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No company assigned</p>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Account Status</span>
              <span className="text-sm font-medium">
                {employer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Verification</span>
              <span className="text-sm font-medium">
                {employer.isVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Account Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created At</span>
              <span className="text-sm font-medium">{formatDate(employer.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">{formatDate(employer.updatedAt)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Employer ID</span>
              <span className="text-xs font-mono text-muted-foreground">{employer.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-xs font-mono text-muted-foreground">{employer.userId}</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
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
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm((p) => ({ ...p, mobile: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={editForm.designation}
                  onChange={(e) => setEditForm((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="HR Manager"
                />
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editForm.department}
                  onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="Human Resources"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Account Status</Label>
                <Select
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, isActive: v === 'active' }))}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-verified">Verification</Label>
                <Select
                  value={editForm.isVerified ? 'verified' : 'unverified'}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, isVerified: v === 'verified' }))
                  }
                >
                  <SelectTrigger id="edit-verified">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Not Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Employer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
