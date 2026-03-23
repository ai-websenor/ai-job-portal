import { useState, useMemo } from 'react';
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
  XCircle,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  FileText,
  Download,
  Eye,
  RotateCcw,
  CreditCard,
  Briefcase,
  Star,
  BookOpen,
  UserCheck,
  RefreshCw,
  Ban,
  TrendingUp,
  Zap,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import routePath from '@/routes/routePath';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import { ICompany, VerificationStatus, GstExtractedData, ApiResponse } from '@/types/index.d';
import { usePermissions } from '@/hooks/usePermissions';

export default function CompanyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { hasPermission } = usePermissions();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [isActive, setIsActive] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showGstDocPreview, setShowGstDocPreview] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  const { data: company, isLoading } = useQuery<ICompany>({
    queryKey: ['company', id],
    queryFn: async () => {
      const response = await http.get(endpoints.company.details(id!));
      const companyData = response.data || response;
      if (companyData) {
        setVerificationStatus(companyData.verificationStatus || 'pending');
        setIsActive(companyData.isActive ?? true);
        setIsVerified(companyData.isVerified ?? false);
      }
      return companyData;
    },
    enabled: !!id,
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['company-subscription', id],
    queryFn: async () => {
      const response = await http.get(endpoints.subscriptions.byCompany(id!));
      return response.data || response || null;
    },
    enabled: !!id,
  });

  const gstData: GstExtractedData | null = useMemo(() => {
    if (!company?.gstExtractedData) return null;
    try {
      return JSON.parse(company.gstExtractedData);
    } catch {
      return null;
    }
  }, [company?.gstExtractedData]);

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

  const handleDelete = () => deleteMutation.mutate();

  const handleVerificationStatusChange = (value: VerificationStatus) => {
    setVerificationStatus(value);
    updateVerificationMutation.mutate({ verificationStatus: value });
  };

  const handleIsActiveChange = (value: string) => {
    const newIsActive = value === 'active';
    setIsActive(newIsActive);
    updateVerificationMutation.mutate({ isActive: newIsActive });
  };

  const handleApproveCompany = () => {
    updateVerificationMutation.mutate({ verificationStatus: 'verified', isVerified: true });
    setVerificationStatus('verified');
    setIsVerified(true);
    setReviewComment('');
  };

  const handleRejectCompany = () => {
    if (!reviewComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    updateVerificationMutation.mutate({ verificationStatus: 'rejected', isVerified: false });
    setVerificationStatus('rejected');
    setIsVerified(false);
    setReviewComment('');
  };

  const handleRequestReupload = () => {
    if (!reviewComment.trim()) {
      toast.error('Please provide a reason for requesting re-upload');
      return;
    }
    updateVerificationMutation.mutate({ verificationStatus: 'pending', isVerified: false });
    setVerificationStatus('pending');
    setIsVerified(false);
    setReviewComment('');
    toast.info(
      'Company marked as pending. Please notify the employer to re-upload the GST document.',
    );
  };

  const handleEditClick = () => navigate(`${routePath.COMPANY.LIST}?edit=${company?.id}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
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
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(routePath.COMPANY.LIST)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Company Details</h1>
            <p className="text-base text-muted-foreground">View and manage company information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission('UPDATE_COMPANY') && (
            <Button variant="outline" onClick={handleEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
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
                    Are you sure you want to delete &ldquo;{company.name}&rdquo;? This action cannot
                    be undone.
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

      {/* ── Hero Card (Banner + Logo + Quick Info) ────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {company.bannerUrl ? (
            <div className="w-full h-56 bg-muted overflow-hidden">
              <img
                src={company.bannerUrl}
                alt={`${company.name} banner`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          )}

          <div className="px-6 pb-6 flex items-start gap-6">
            {company.logoUrl ? (
              <div className="w-24 h-24 bg-white border-2 rounded-xl overflow-hidden flex-shrink-0 -mt-10 ring-4 ring-background shadow-md">
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 -mt-10 ring-4 ring-background border-2 shadow-md">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0 pt-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold">{company.name}</h2>
                  {company.tagline && (
                    <p className="text-base text-muted-foreground mt-1">{company.tagline}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {isVerified && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  <Badge
                    className={
                      isActive
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-gray-400 hover:bg-gray-500 text-white'
                    }
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {company.verificationStatus && (
                    <Badge
                      variant="outline"
                      className={
                        company.verificationStatus === 'verified'
                          ? 'border-green-300 text-green-700'
                          : company.verificationStatus === 'rejected'
                            ? 'border-red-300 text-red-700'
                            : 'border-yellow-300 text-yellow-700'
                      }
                    >
                      {company.verificationStatus.charAt(0).toUpperCase() +
                        company.verificationStatus.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                {company.industry && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{company.industry}</span>
                  </div>
                )}
                {company.headquarters && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{company.headquarters}</span>
                  </div>
                )}
                {company.companySize && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>{company.companySize} employees</span>
                  </div>
                )}
                {company.yearEstablished && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Est. {company.yearEstablished}</span>
                  </div>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>{company.website}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Company Profile (all registration fields) ─────────── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Company Profile</CardTitle>
              <CardDescription className="text-sm">
                All information filled during registration and profile setup
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Company Name</p>
              <p className="text-base font-semibold">{company.name}</p>
            </div>

            {company.tagline && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Tagline</p>
                <p className="text-base">{company.tagline}</p>
              </div>
            )}

            {company.industry && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Industry</p>
                <p className="text-base">{company.industry}</p>
              </div>
            )}

            {company.companyType && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Company Type</p>
                <p className="text-base capitalize">{company.companyType.replace(/_/g, ' ')}</p>
              </div>
            )}

            {company.companySize && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                <p className="text-base">{company.companySize} employees</p>
              </div>
            )}

            {company.employeeCount != null && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Exact Employee Count</p>
                <p className="text-base">{company.employeeCount.toLocaleString()}</p>
              </div>
            )}

            {company.yearEstablished && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Year Established</p>
                <p className="text-base">{company.yearEstablished}</p>
              </div>
            )}

            {company.headquarters && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Headquarters</p>
                <p className="text-base">{company.headquarters}</p>
              </div>
            )}

            {company.website && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Website</p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-primary hover:underline break-all"
                >
                  {company.website}
                </a>
              </div>
            )}

            {company.slug && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">URL Slug</p>
                <p className="text-base font-mono text-muted-foreground">/{company.slug}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Registered On</p>
              <p className="text-base">
                {new Date(company.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-base">
                {new Date(company.updatedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── About / Mission / Culture / Benefits ─────────────── */}
      {(company.description || company.mission || company.culture || company.benefits) && (
        <div className="grid gap-6 md:grid-cols-2">
          {company.description && (
            <Card className={!company.mission && !company.culture ? 'md:col-span-2' : ''}>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg">About the Company</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {company.description}
                </p>
              </CardContent>
            </Card>
          )}

          {company.mission && (
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg">Mission</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {company.mission}
                </p>
              </CardContent>
            </Card>
          )}

          {company.culture && (
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg">Culture</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {company.culture}
                </p>
              </CardContent>
            </Card>
          )}

          {company.benefits && (
            <Card className="md:col-span-2">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-lg">Employee Benefits</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {company.benefits}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Online Presence & Legal ───────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Social / Online Links */}
        {(company.linkedinUrl || company.twitterUrl || company.facebookUrl) && (
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                  <Link2 className="h-4 w-4 text-sky-600" />
                </div>
                <CardTitle className="text-lg">Online Presence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {company.linkedinUrl && (
                <a
                  href={company.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 shrink-0">
                    <span className="text-blue-700 font-bold">in</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">LinkedIn</p>
                    <p className="text-sm text-muted-foreground truncate">{company.linkedinUrl}</p>
                  </div>
                </a>
              )}
              {company.twitterUrl && (
                <a
                  href={company.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 shrink-0">
                    <span className="text-sky-700 font-bold text-lg">𝕏</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Twitter / X</p>
                    <p className="text-sm text-muted-foreground truncate">{company.twitterUrl}</p>
                  </div>
                </a>
              )}
              {company.facebookUrl && (
                <a
                  href={company.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 shrink-0">
                    <span className="text-indigo-700 font-bold text-lg">f</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Facebook</p>
                    <p className="text-sm text-muted-foreground truncate">{company.facebookUrl}</p>
                  </div>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* KYC / Legal */}
        {(company.panNumber ||
          company.gstNumber ||
          company.cinNumber ||
          company.gstValidationStatus) && (
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                </div>
                <CardTitle className="text-lg">Legal & KYC</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-0">
              {company.panNumber && (
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm font-medium text-muted-foreground">PAN Number</span>
                  <span className="text-base font-mono font-semibold tracking-widest">
                    {company.panNumber}
                  </span>
                </div>
              )}
              {company.gstNumber && (
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm font-medium text-muted-foreground">GST Number</span>
                  <span className="text-base font-mono font-semibold tracking-widest">
                    {company.gstNumber}
                  </span>
                </div>
              )}
              {company.cinNumber && (
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm font-medium text-muted-foreground">CIN Number</span>
                  <span className="text-base font-mono font-semibold tracking-widest">
                    {company.cinNumber}
                  </span>
                </div>
              )}
              {company.gstValidationStatus && (
                <div className="flex items-center justify-between py-3 border-b last:border-0">
                  <span className="text-sm font-medium text-muted-foreground">GST Validation</span>
                  <Badge
                    className={
                      company.gstValidationStatus === 'valid'
                        ? 'bg-green-500 text-white'
                        : company.gstValidationStatus === 'invalid'
                          ? 'bg-red-500 text-white'
                          : company.gstValidationStatus === 'bypassed'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-400 text-white'
                    }
                  >
                    {company.gstValidationStatus.charAt(0).toUpperCase() +
                      company.gstValidationStatus.slice(1)}
                  </Badge>
                </div>
              )}
              {company.kycDocuments && (
                <div className="flex items-center gap-2 pt-3">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-green-700 font-medium">KYC Documents Uploaded</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── GST Document Review ───────────────────────────────── */}
      {hasPermission('UPDATE_COMPANY') &&
        (company.gstDocumentUrl || company.gstValidationStatus) && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">GST Document Review</CardTitle>
                    <CardDescription className="text-sm">
                      Review uploaded GST document and validation results
                    </CardDescription>
                  </div>
                </div>
                {company.gstValidationStatus && (
                  <Badge
                    className={
                      company.gstValidationStatus === 'valid'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : company.gstValidationStatus === 'invalid'
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : company.gstValidationStatus === 'bypassed'
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }
                  >
                    {company.gstValidationStatus === 'valid' && (
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    )}
                    {company.gstValidationStatus === 'invalid' && (
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                    )}
                    {company.gstValidationStatus === 'bypassed' && (
                      <ShieldOff className="h-3.5 w-3.5 mr-1" />
                    )}
                    {company.gstValidationStatus === 'pending' && (
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    )}
                    GST:{' '}
                    {company.gstValidationStatus.charAt(0).toUpperCase() +
                      company.gstValidationStatus.slice(1)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Entered GST Number</Label>
                  <p className="text-base font-mono bg-muted px-4 py-3 rounded-md">
                    {company.gstNumber || 'Not provided'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Extracted GST Number (OCR)</Label>
                  <p className="text-base font-mono bg-muted px-4 py-3 rounded-md">
                    {gstData?.gstNumber || 'Not detected'}
                  </p>
                </div>
              </div>

              {gstData?.gstNumber && company.gstNumber && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                  {gstData.gstNumber === company.gstNumber ? (
                    <>
                      <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-base text-green-700 font-medium">
                        GST number in document matches the entered GST number
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                      <span className="text-base text-orange-700 font-medium">
                        GST number in document does not match the entered GST number
                      </span>
                    </>
                  )}
                </div>
              )}

              {company.gstDocumentUrl && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Uploaded GST Document</Label>
                  <div className="flex gap-2">
                    <Dialog open={showGstDocPreview} onOpenChange={setShowGstDocPreview}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>GST Document Preview</DialogTitle>
                          <DialogDescription>
                            GST certificate document for {company.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          {company.gstDocumentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img
                              src={company.gstDocumentUrl}
                              alt="GST document"
                              className="w-full h-auto rounded-lg border"
                            />
                          ) : company.gstDocumentUrl.match(/\.pdf$/i) ? (
                            <iframe
                              src={company.gstDocumentUrl}
                              className="w-full h-[70vh] border rounded-lg"
                              title="GST document"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted">
                              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                              <p className="text-base text-muted-foreground mb-4">
                                Preview not available for this file type
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => window.open(company.gstDocumentUrl, '_blank')}
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
                      onClick={() => window.open(company.gstDocumentUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Admin Review</Label>
                <Textarea
                  placeholder="Add a comment or reason (required for Reject / Request Re-upload)..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleApproveCompany}
                    disabled={updateVerificationMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRejectCompany}
                    disabled={updateVerificationMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRequestReupload}
                    disabled={updateVerificationMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Request Re-upload
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current verification status:{' '}
                  <span className="font-semibold capitalize">{verificationStatus}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* ── Verification Document ─────────────────────────────── */}
      {company.verificationDocuments && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Verification Document</CardTitle>
                <CardDescription className="text-sm">
                  Business verification document (KYC / PAN / GST)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 mb-5">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-medium">Document uploaded</span>
            </div>
            <div className="flex gap-2">
              <Dialog open={showDocPreview} onOpenChange={setShowDocPreview}>
                <DialogTrigger asChild>
                  <Button variant="outline">
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
                        <p className="text-base text-muted-foreground mb-4">
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
                onClick={() => window.open(company.verificationDocuments, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Admin Controls ────────────────────────────────────── */}
      {hasPermission('UPDATE_COMPANY') && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Admin Controls</CardTitle>
                <CardDescription className="text-sm">
                  Manage company status and verification settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="verification-status" className="text-sm font-medium">
                  Verification Status
                </Label>
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
                <p className="text-sm text-muted-foreground">
                  Workflow status for verification process
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is-active" className="text-sm font-medium">
                  Company Status
                </Label>
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
                <p className="text-sm text-muted-foreground">
                  Enable or disable company visibility
                </p>
              </div>
            </div>

            {company.kycDocuments && (
              <div className="flex items-center gap-2 mt-5 pt-5 border-t">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-sm text-muted-foreground">KYC Documents Uploaded</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Subscription Details ──────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Subscription Plan</CardTitle>
                <CardDescription className="text-sm">
                  Usage limits &amp; billing details
                </CardDescription>
              </div>
            </div>
            {!subscriptionLoading && subscription && (
              <Badge
                className={
                  subscription.canceledAt
                    ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
                    : subscription.isActive
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100'
                }
                variant="outline"
              >
                {subscription.canceledAt ? (
                  <>
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Canceled
                  </>
                ) : subscription.isActive ? (
                  <>
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Active
                  </>
                ) : (
                  'Inactive'
                )}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {subscriptionLoading ? (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ) : subscription ? (
            <>
              {/* Plan header strip */}
              <div className="px-6 py-5 bg-gradient-to-r from-primary/5 to-transparent border-b">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold capitalize">
                        {subscription.plan} Plan
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                      <span className="capitalize">
                        {subscription.billingCycle?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground/40">|</span>
                      <span className="text-base font-semibold text-foreground">
                        {subscription.currency} {Number(subscription.amount).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground/40">|</span>
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Auto-renew: {subscription.autoRenew ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground">Valid until</p>
                    <p className="text-base font-semibold">
                      {new Date(subscription.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage stats */}
              <div className="px-6 py-5">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Usage Overview
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Job Postings */}
                  <div className="rounded-lg border bg-card p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                        </div>
                        Job Postings
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {subscription.jobPostingUsed} / {subscription.jobPostingLimit}
                      </span>
                    </div>
                    <Progress
                      value={
                        subscription.jobPostingLimit
                          ? (subscription.jobPostingUsed / subscription.jobPostingLimit) * 100
                          : 0
                      }
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {subscription.jobPostingLimit - subscription.jobPostingUsed} remaining
                    </p>
                  </div>

                  {/* Featured Jobs */}
                  <div className="rounded-lg border bg-card p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-50">
                          <Star className="h-4 w-4 text-yellow-600" />
                        </div>
                        Featured Jobs
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {subscription.featuredJobsUsed} / {subscription.featuredJobsLimit}
                      </span>
                    </div>
                    <Progress
                      value={
                        subscription.featuredJobsLimit
                          ? (subscription.featuredJobsUsed / subscription.featuredJobsLimit) * 100
                          : 0
                      }
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {subscription.featuredJobsLimit - subscription.featuredJobsUsed} remaining
                    </p>
                  </div>

                  {/* Resume Access */}
                  <div className="rounded-lg border bg-card p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                          <BookOpen className="h-4 w-4 text-green-600" />
                        </div>
                        Resume Access
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {subscription.resumeAccessUsed} / {subscription.resumeAccessLimit ?? '∞'}
                      </span>
                    </div>
                    {subscription.resumeAccessLimit ? (
                      <>
                        <Progress
                          value={
                            (subscription.resumeAccessUsed / subscription.resumeAccessLimit) * 100
                          }
                          className="h-2"
                        />
                        <p className="text-sm text-muted-foreground">
                          {subscription.resumeAccessLimit - subscription.resumeAccessUsed} remaining
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="h-2 rounded-full bg-green-100" />
                        <p className="text-sm text-green-600 font-medium">Unlimited access</p>
                      </>
                    )}
                  </div>

                  {/* Team Members */}
                  {subscription.memberAddingLimit != null && (
                    <div className="rounded-lg border bg-card p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50">
                            <UserCheck className="h-4 w-4 text-purple-600" />
                          </div>
                          Team Members
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {subscription.memberAddingUsed ?? 0} / {subscription.memberAddingLimit}
                        </span>
                      </div>
                      <Progress
                        value={
                          subscription.memberAddingLimit
                            ? ((subscription.memberAddingUsed ?? 0) /
                                subscription.memberAddingLimit) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        {subscription.memberAddingLimit - (subscription.memberAddingUsed ?? 0)}{' '}
                        remaining
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing info footer */}
              <div className="px-6 py-4 border-t bg-muted/20">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Billing Info
                </p>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Start:</span>
                    <span className="text-sm font-semibold">
                      {new Date(subscription.startDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Ends:</span>
                    <span className="text-sm font-semibold">
                      {new Date(subscription.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {subscription.canceledAt && (
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-destructive shrink-0" />
                      <span className="text-sm text-muted-foreground">Canceled:</span>
                      <span className="text-sm font-semibold text-destructive">
                        {new Date(subscription.canceledAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium">No Subscription Found</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                This company hasn&apos;t subscribed to any plan yet. Subscription details will
                appear here once active.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
