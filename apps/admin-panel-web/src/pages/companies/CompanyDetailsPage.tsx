import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Globe,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  FileText,
  Download,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import routePath from '@/routes/routePath';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ICompany, VerificationStatus, ApiResponse } from '@/types/index.d';
import { usePermissions } from '@/hooks/usePermissions';

export default function CompanyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // RBAC: Check permissions
  const { hasPermission } = usePermissions();

  // Subscription checkboxes state (dummy for future)
  const [subscriptions, setSubscriptions] = useState({
    basicPlan: false,
    proPlan: true,
    enterprisePlan: false,
    premiumSupport: true,
    advancedAnalytics: false,
  });

  // Verification settings state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [isActive, setIsActive] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);

  // Fetch company details
  const { data: company, isLoading } = useQuery<ICompany>({
    queryKey: ['company', id],
    queryFn: async () => {
      const response = await http.get(endpoints.company.details(id!));
      const companyData = response.data || response;
      // Set verification settings from fetched data
      if (companyData) {
        setVerificationStatus(companyData.verificationStatus || 'pending');
        setIsActive(companyData.isActive ?? true);
        setIsVerified(companyData.isVerified ?? false);
      }
      return companyData;
    },
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await http.delete(endpoints.company.delete(id!));
    },
    onSuccess: () => {
      toast.success('Company deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      navigate(routePath.COMPANY.LIST);
    },
    onError: (error: unknown) => {
      toast.error((error as ApiResponse)?.message || 'Failed to delete company');
    },
  });

  // Update verification settings mutation
  const updateVerificationMutation = useMutation({
    mutationFn: async (data: {
      verificationStatus?: VerificationStatus;
      isActive?: boolean;
      isVerified?: boolean;
    }) => {
      return await http.put(endpoints.company.update(id!), data);
    },
    onSuccess: () => {
      toast.success('Verification settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (error: Error) => {
      toast.error(
        (error as unknown as ApiResponse)?.message || 'Failed to update verification settings',
      );
    },
  });

  // Save settings mutation (dummy for future)
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement actual API call to save permissions and subscriptions
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate();
  };

  const handleVerificationStatusChange = (value: VerificationStatus) => {
    setVerificationStatus(value);
    updateVerificationMutation.mutate({ verificationStatus: value });
  };

  const handleIsActiveChange = (value: string) => {
    const newIsActive = value === 'active';
    setIsActive(newIsActive);
    updateVerificationMutation.mutate({ isActive: newIsActive });
  };

  const handleEditClick = () => {
    // Navigate to list page with edit mode
    navigate(`${routePath.COMPANY.LIST}?edit=${company?.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Company not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(routePath.COMPANY.LIST)}
            >
              Back to Companies
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
          <Button variant="ghost" size="icon" onClick={() => navigate(routePath.COMPANY.LIST)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Company Details</h1>
            <p className="text-muted-foreground">View and manage company information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Show Edit button only if user has UPDATE_COMPANY permission */}
          {hasPermission('UPDATE_COMPANY') && (
            <Button variant="outline" onClick={handleEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {/* Show Delete button only if user has DELETE_COMPANY permission */}
          {hasPermission('DELETE_COMPANY') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Company</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{company.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Banner and Logo */}
      <Card>
        <CardContent className="p-0">
          {company.bannerUrl && (
            <div className="w-full h-48 bg-muted overflow-hidden rounded-t-lg">
              <img
                src={company.bannerUrl}
                alt={`${company.name} banner`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6 flex items-start gap-6">
            {company.logoUrl ? (
              <div className="w-24 h-24 bg-white border rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{company.name}</h2>
                  {company.tagline && (
                    <p className="text-muted-foreground mt-1">{company.tagline}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isVerified && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {isActive ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Active</Badge>
                  ) : (
                    <Badge className="bg-gray-500 hover:bg-gray-600 text-white">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {company.industry && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{company.industry}</span>
                  </div>
                )}
                {company.headquarters && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{company.headquarters}</span>
                  </div>
                )}
                {company.companySize && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{company.companySize} employees</span>
                  </div>
                )}
                {company.yearEstablished && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Est. {company.yearEstablished}</span>
                  </div>
                )}
              </div>
              {company.website && (
                <div className="flex items-center gap-2 mt-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* About */}
        {company.description && (
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.companyType && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Company Type</span>
                <span className="text-sm font-medium capitalize">{company.companyType}</span>
              </div>
            )}
            {company.employeeCount && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Employee Count</span>
                <span className="text-sm font-medium">{company.employeeCount}</span>
              </div>
            )}
            {company.slug && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Slug</span>
                <span className="text-sm font-medium font-mono">{company.slug}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm font-medium">
                {new Date(company.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">
                {new Date(company.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Mission */}
        {company.mission && (
          <Card>
            <CardHeader>
              <CardTitle>Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.mission}</p>
            </CardContent>
          </Card>
        )}

        {/* Culture */}
        {company.culture && (
          <Card>
            <CardHeader>
              <CardTitle>Culture</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.culture}</p>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        {company.benefits && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.benefits}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {(company.linkedinUrl || company.twitterUrl || company.facebookUrl) && (
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.linkedinUrl && (
                <a
                  href={company.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {company.twitterUrl && (
                <a
                  href={company.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Twitter
                </a>
              )}
              {company.facebookUrl && (
                <a
                  href={company.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Facebook
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* KYC Documents */}
        {(company.panNumber || company.gstNumber || company.cinNumber) && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.panNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">PAN Number</span>
                  <span className="text-sm font-medium font-mono">{company.panNumber}</span>
                </div>
              )}
              {company.gstNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">GST Number</span>
                  <span className="text-sm font-medium font-mono">{company.gstNumber}</span>
                </div>
              )}
              {company.cinNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CIN Number</span>
                  <span className="text-sm font-medium font-mono">{company.cinNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Settings - Only show if user has UPDATE_COMPANY permission */}
        {hasPermission('UPDATE_COMPANY') && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Settings</CardTitle>
              <CardDescription>Manage company verification status and activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-status">Verification Status</Label>
                <Select
                  value={verificationStatus}
                  onValueChange={handleVerificationStatusChange}
                  disabled={updateVerificationMutation.isPending}
                >
                  <SelectTrigger id="verification-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Workflow status for verification process
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is-active">Company Status</Label>
                <Select
                  value={isActive ? 'active' : 'inactive'}
                  onValueChange={handleIsActiveChange}
                  disabled={updateVerificationMutation.isPending}
                >
                  <SelectTrigger id="is-active">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Enable or disable company visibility
                </p>
              </div>

              {company.kycDocuments && (
                <div className="flex items-center gap-2 pt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">KYC Documents Uploaded</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Document Preview */}
        {company.verificationDocuments && (
          <Card>
            <CardHeader>
              <CardTitle>Verification Document</CardTitle>
              <CardDescription>Business verification document (KYC/PAN/GST)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Document uploaded</span>
              </div>
              <div className="flex gap-2">
                <Dialog open={showDocPreview} onOpenChange={setShowDocPreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Verification Document Preview</DialogTitle>
                      <DialogDescription>
                        Business verification document for {company.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      {company.verificationDocuments.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={company.verificationDocuments}
                          alt="Verification document"
                          className="w-full h-auto rounded-lg border"
                        />
                      ) : company.verificationDocuments.match(/\.pdf$/i) ? (
                        <iframe
                          src={company.verificationDocuments}
                          className="w-full h-[70vh] border rounded-lg"
                          title="Verification document"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted">
                          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Preview not available for this file type
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => window.open(company.verificationDocuments, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Document
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(company.verificationDocuments, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscriptions (Dummy for Future) */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>Manage company subscription plans (Coming Soon)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="basicPlan"
                checked={subscriptions.basicPlan}
                onCheckedChange={(checked) =>
                  setSubscriptions({ ...subscriptions, basicPlan: checked as boolean })
                }
              />
              <Label htmlFor="basicPlan" className="cursor-pointer">
                Basic Plan
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="proPlan"
                checked={subscriptions.proPlan}
                onCheckedChange={(checked) =>
                  setSubscriptions({ ...subscriptions, proPlan: checked as boolean })
                }
              />
              <Label htmlFor="proPlan" className="cursor-pointer">
                Pro Plan
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enterprisePlan"
                checked={subscriptions.enterprisePlan}
                onCheckedChange={(checked) =>
                  setSubscriptions({ ...subscriptions, enterprisePlan: checked as boolean })
                }
              />
              <Label htmlFor="enterprisePlan" className="cursor-pointer">
                Enterprise Plan
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="premiumSupport"
                checked={subscriptions.premiumSupport}
                onCheckedChange={(checked) =>
                  setSubscriptions({ ...subscriptions, premiumSupport: checked as boolean })
                }
              />
              <Label htmlFor="premiumSupport" className="cursor-pointer">
                Premium Support
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="advancedAnalytics"
                checked={subscriptions.advancedAnalytics}
                onCheckedChange={(checked) =>
                  setSubscriptions({ ...subscriptions, advancedAnalytics: checked as boolean })
                }
              />
              <Label htmlFor="advancedAnalytics" className="cursor-pointer">
                Advanced Analytics
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending} size="lg">
          {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
