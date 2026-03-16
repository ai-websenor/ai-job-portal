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
import { Switch } from '@/components/ui/switch';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { ISubscriptionPlan, BillingCycle } from '@/types';

interface PlansResponse {
  data: ISubscriptionPlan[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const SubscriptionPlansPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [billingCycleFilter, setBillingCycleFilter] = useState<'all' | BillingCycle>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ISubscriptionPlan | null>(null);

  // Form state for Add
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'INR',
    billingCycle: 'monthly' as BillingCycle,
    features: '',
    jobPostLimit: '',
    resumeAccessLimit: '',
    featuredJobs: '',
    memberAddingLimit: '',
    sortOrder: '0',
  });

  // Form state for Edit
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'INR',
    billingCycle: 'monthly' as BillingCycle,
    features: '',
    jobPostLimit: '',
    resumeAccessLimit: '',
    featuredJobs: '',
    memberAddingLimit: '',
    sortOrder: '0',
    isActive: true,
  });

  // Reset to page 1 whenever the debounced search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch plans
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription-plans', page, limit, debouncedSearch, billingCycleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (billingCycleFilter !== 'all') params.set('billingCycle', billingCycleFilter);
      const response = await http.get(`${endpoints.subscriptions.plans.list}?${params}`);
      return response as unknown as PlansResponse;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (planData: any) => {
      const payload: any = {
        ...planData,
        price: parseFloat(planData.price),
        jobPostLimit: parseInt(planData.jobPostLimit),
        resumeAccessLimit: parseInt(planData.resumeAccessLimit),
        featuredJobs: parseInt(planData.featuredJobs),
        sortOrder: parseInt(planData.sortOrder),
        features: planData.features
          .split('\n')
          .map((f: string) => f.trim())
          .filter(Boolean),
      };
      if (planData.memberAddingLimit && planData.memberAddingLimit.trim() !== '') {
        payload.memberAddingLimit = parseInt(planData.memberAddingLimit);
      }
      return await http.post(endpoints.subscriptions.plans.create, payload);
    },
    onSuccess: () => {
      setPage(1);
      queryClient.refetchQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan created successfully');
      setAddDialogOpen(false);
      resetAddForm();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to create plan';
      toast.error(msg);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, planData }: { id: string; planData: any }) => {
      const payload: any = {
        ...planData,
        price: parseFloat(planData.price),
        jobPostLimit: parseInt(planData.jobPostLimit),
        resumeAccessLimit: parseInt(planData.resumeAccessLimit),
        featuredJobs: parseInt(planData.featuredJobs),
        sortOrder: parseInt(planData.sortOrder),
        features: planData.features
          .split('\n')
          .map((f: string) => f.trim())
          .filter(Boolean),
      };
      if (planData.memberAddingLimit && planData.memberAddingLimit.trim() !== '') {
        payload.memberAddingLimit = parseInt(planData.memberAddingLimit);
      } else {
        payload.memberAddingLimit = null;
      }
      return await http.put(endpoints.subscriptions.plans.update(id), payload);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan updated successfully');
      setEditDialogOpen(false);
      setSelectedPlan(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update plan';
      toast.error(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.subscriptions.plans.delete(id));
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to delete plan';
      toast.error(msg);
    },
  });

  const resetAddForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'INR',
      billingCycle: 'monthly',
      features: '',
      jobPostLimit: '',
      resumeAccessLimit: '',
      featuredJobs: '',
      memberAddingLimit: '',
      sortOrder: '0',
    });
  };

  const handleAddPlan = () => {
    if (!formData.name.trim() || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditPlan = () => {
    if (!selectedPlan || !editFormData.name.trim() || !editFormData.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate({ id: selectedPlan.id, planData: editFormData });
  };

  const handleDeletePlan = () => {
    if (selectedPlan) {
      deleteMutation.mutate(selectedPlan.id);
    }
  };

  const openEditDialog = (plan: ISubscriptionPlan) => {
    setSelectedPlan(plan);

    // Parse features - handle both string (JSON) and array formats
    let featuresText = '';
    if (typeof plan.features === 'string') {
      try {
        const parsed = JSON.parse(plan.features);
        featuresText = Array.isArray(parsed) ? parsed.join('\n') : plan.features;
      } catch {
        featuresText = plan.features;
      }
    } else if (Array.isArray(plan.features)) {
      featuresText = plan.features.join('\n');
    }

    setEditFormData({
      name: plan.name,
      description: plan.description || '',
      price: (plan.price ?? 0).toString(),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      features: featuresText,
      jobPostLimit: (plan.jobPostLimit ?? 0).toString(),
      resumeAccessLimit: (plan.resumeAccessLimit ?? 0).toString(),
      featuredJobs: (plan.featuredJobs ?? 0).toString(),
      memberAddingLimit: plan.memberAddingLimit != null ? plan.memberAddingLimit.toString() : '',
      sortOrder: (plan.sortOrder ?? 0).toString(),
      isActive: plan.isActive,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (plan: ISubscriptionPlan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const plans = data?.data || [];
  const totalPlans = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;
  const activePlans = plans.filter((p) => p.isActive).length;
  const monthlyPlans = plans.filter((p) => p.billingCycle === 'monthly').length;
  const annualPlans = plans.filter((p) => p.billingCycle === 'yearly').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
            <p className="text-muted-foreground">
              Manage subscription plans, pricing, and features
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Plans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Plans</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{annualPlans}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by plan name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={billingCycleFilter} onValueChange={(v: any) => setBillingCycleFilter(v)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Billing Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                <SelectItem value="one_time">One Time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>A list of all subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading plans...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-destructive">Failed to load plans</div>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No plans found</h3>
              <p className="text-muted-foreground mb-4">Create your first subscription plan</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Plan
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Job Posts</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Resume Access</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sort Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan, index) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.name}</div>
                          {plan.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {plan.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {plan.currency} {plan.price.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.billingCycle === 'monthly' ? 'default' : 'secondary'}>
                          {plan.billingCycle}
                        </Badge>
                      </TableCell>
                      <TableCell>{plan.jobPostLimit}</TableCell>
                      <TableCell>{plan.featuredJobs}</TableCell>
                      <TableCell>{plan.resumeAccessLimit}</TableCell>
                      <TableCell>
                        {plan.memberAddingLimit != null ? plan.memberAddingLimit : 'Unlimited'}
                      </TableCell>
                      <TableCell>
                        {plan.isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{plan.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(plan)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({totalPlans} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Subscription Plan</DialogTitle>
            <DialogDescription>Create a new subscription plan</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Premium, Enterprise"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the plan"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingCycle">Billing Cycle *</Label>
              <Select
                value={formData.billingCycle}
                onValueChange={(v: BillingCycle) => setFormData({ ...formData, billingCycle: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="jobPostLimit">Job Post Limit *</Label>
                <Input
                  id="jobPostLimit"
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.jobPostLimit}
                  onChange={(e) => setFormData({ ...formData, jobPostLimit: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="featuredJobs">Featured Jobs</Label>
                <Input
                  id="featuredJobs"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.featuredJobs}
                  onChange={(e) => setFormData({ ...formData, featuredJobs: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resumeAccessLimit">Resume Access</Label>
                <Input
                  id="resumeAccessLimit"
                  type="number"
                  placeholder="e.g., 100"
                  value={formData.resumeAccessLimit}
                  onChange={(e) => setFormData({ ...formData, resumeAccessLimit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memberAddingLimit">Member Adding Limit</Label>
              <Input
                id="memberAddingLimit"
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.memberAddingLimit}
                onChange={(e) => setFormData({ ...formData, memberAddingLimit: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum employers a super_employer can add. Leave empty for unlimited.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="features">Key Features (one per line)</Label>
              <Textarea
                id="features"
                placeholder="Unlimited job posts&#10;Priority support&#10;Featured listings"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={5}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                placeholder="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPlan} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>Update plan details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Plan Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={editFormData.currency}
                  onValueChange={(v) => setEditFormData({ ...editFormData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-billingCycle">Billing Cycle *</Label>
              <Select
                value={editFormData.billingCycle}
                onValueChange={(v: BillingCycle) =>
                  setEditFormData({ ...editFormData, billingCycle: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-jobPostLimit">Job Post Limit *</Label>
                <Input
                  id="edit-jobPostLimit"
                  type="number"
                  value={editFormData.jobPostLimit}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, jobPostLimit: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-featuredJobs">Featured Jobs</Label>
                <Input
                  id="edit-featuredJobs"
                  type="number"
                  value={editFormData.featuredJobs}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, featuredJobs: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-resumeAccessLimit">Resume Access</Label>
                <Input
                  id="edit-resumeAccessLimit"
                  type="number"
                  value={editFormData.resumeAccessLimit}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, resumeAccessLimit: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-memberAddingLimit">Member Adding Limit</Label>
              <Input
                id="edit-memberAddingLimit"
                type="number"
                placeholder="Leave empty for unlimited"
                value={editFormData.memberAddingLimit}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, memberAddingLimit: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum employers a super_employer can add. Leave empty for unlimited.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-features">Key Features (one per line)</Label>
              <Textarea
                id="edit-features"
                value={editFormData.features}
                onChange={(e) => setEditFormData({ ...editFormData, features: e.target.value })}
                rows={5}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={editFormData.sortOrder}
                onChange={(e) => setEditFormData({ ...editFormData, sortOrder: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-isActive">Status</Label>
              <div className="flex items-center h-10">
                <Switch
                  id="edit-isActive"
                  checked={editFormData.isActive}
                  onCheckedChange={(checked) =>
                    setEditFormData({ ...editFormData, isActive: checked })
                  }
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {editFormData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPlan} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the plan "{selectedPlan?.name}"? This action cannot be
              undone. Existing subscriptions using this plan will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
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

export default SubscriptionPlansPage;
