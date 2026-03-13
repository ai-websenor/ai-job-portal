/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, CheckCircle2, Package, Loader2 } from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import type { IEmployer, ISubscriptionPlan } from '@/types';

interface EmployersResponse {
  data: IEmployer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PlansResponse {
  data: ISubscriptionPlan[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ManualActivationPage = () => {
  const queryClient = useQueryClient();
  const [employerSearch, setEmployerSearch] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState<IEmployer | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const debouncedSearch = useDebounce(employerSearch, 500);

  // Fetch employers
  const { data: employersData, isLoading: employersLoading } = useQuery({
    queryKey: ['employers', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const response = await http.get(`${endpoints.employer.list}?${params}`);
      return response as unknown as EmployersResponse;
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Fetch active plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans-active'],
    queryFn: async () => {
      const response = await http.get(`${endpoints.subscriptions.plans.list}?limit=100`);
      return response as unknown as PlansResponse;
    },
  });

  // Manual activation mutation
  const activateMutation = useMutation({
    mutationFn: async ({ userId, planId }: { userId: string; planId: string }) => {
      return await http.post(endpoints.subscriptions.manualActivate, {
        userId,
        planId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription activated successfully!');
      // Reset form
      setSelectedEmployer(null);
      setSelectedPlanId('');
      setEmployerSearch('');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to activate subscription';
      toast.error(msg);
    },
  });

  const handleActivate = () => {
    if (!selectedEmployer) {
      toast.error('Please select an employer');
      return;
    }
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan');
      return;
    }

    activateMutation.mutate({
      userId: selectedEmployer.userId,
      planId: selectedPlanId,
    });
  };

  const handleSelectEmployer = (employer: IEmployer) => {
    setSelectedEmployer(employer);
    setEmployerSearch(`${employer.firstName} ${employer.lastName} (${employer.email})`);
  };

  const employers = employersData?.data || [];
  const plans = (plansData?.data || []).filter((plan) => plan.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <UserPlus className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manual Subscription Activation</h1>
            <p className="text-muted-foreground">
              Manually activate subscription for employers without payment
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">About Manual Activation</CardTitle>
          <CardDescription className="text-blue-700">
            This feature allows you to grant subscription access to employers without requiring
            payment. This is useful for trials, partnerships, or special promotions.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Activation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Activate Subscription</CardTitle>
          <CardDescription>Search for an employer and select a plan to activate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Employer Search */}
            <div className="space-y-2">
              <Label htmlFor="employer-search">Search Employer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employer-search"
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={employerSearch}
                  onChange={(e) => {
                    setEmployerSearch(e.target.value);
                    if (
                      e.target.value !==
                      `${selectedEmployer?.firstName} ${selectedEmployer?.lastName} (${selectedEmployer?.email})`
                    ) {
                      setSelectedEmployer(null);
                    }
                  }}
                />
                {employersLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Employer Search Results */}
              {employerSearch.length >= 2 && !selectedEmployer && employers.length > 0 && (
                <Card className="mt-2 max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    {employers.map((employer) => (
                      <button
                        key={employer.id}
                        onClick={() => handleSelectEmployer(employer)}
                        className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="font-medium">
                          {employer.firstName} {employer.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{employer.email}</div>
                        {employer.designation && (
                          <div className="text-xs text-muted-foreground">
                            {employer.designation}
                          </div>
                        )}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {employerSearch.length >= 2 &&
                !selectedEmployer &&
                !employersLoading &&
                employers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">No employers found</p>
                )}
            </div>

            {/* Selected Employer Display */}
            {selectedEmployer && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-900">
                        {selectedEmployer.firstName} {selectedEmployer.lastName}
                      </div>
                      <div className="text-sm text-green-700">{selectedEmployer.email}</div>
                      {selectedEmployer.designation && (
                        <div className="text-xs text-green-600 mt-1">
                          {selectedEmployer.designation}
                          {selectedEmployer.department && ` • ${selectedEmployer.department}`}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label htmlFor="plan-select">Select Subscription Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder="Choose a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plansLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading plans...</span>
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No active plans available
                    </div>
                  ) : (
                    plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium">{plan.name}</span>
                          <span className="text-muted-foreground">
                            {plan.currency} {plan.price.toLocaleString()} / {plan.billingCycle}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Selected Plan Details */}
              {selectedPlanId && (
                <Card className="mt-2 border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    {(() => {
                      const plan = plans.find((p) => p.id === selectedPlanId);
                      if (!plan) return null;
                      return (
                        <div>
                          <div className="flex items-start gap-3 mb-3">
                            <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <div className="font-medium text-blue-900">{plan.name}</div>
                              <div className="text-sm text-blue-700 mt-1">
                                {plan.description || 'No description'}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-blue-200">
                            <div>
                              <div className="text-xs text-blue-600">Job Posts</div>
                              <div className="font-medium text-blue-900">{plan.jobPostLimit}</div>
                            </div>
                            <div>
                              <div className="text-xs text-blue-600">Featured Jobs</div>
                              <div className="font-medium text-blue-900">{plan.featuredJobs}</div>
                            </div>
                            <div>
                              <div className="text-xs text-blue-600">Resume Access</div>
                              <div className="font-medium text-blue-900">
                                {plan.resumeAccessLimit}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Activate Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleActivate}
                disabled={!selectedEmployer || !selectedPlanId || activateMutation.isPending}
                size="lg"
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Activate Subscription
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualActivationPage;
