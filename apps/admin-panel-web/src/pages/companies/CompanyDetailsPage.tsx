/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
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
  BarChart3,
  ExternalLink,
  Mail,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import {
  ICompany,
  IEmployer,
  VerificationStatus,
  GstExtractedData,
  ApiResponse,
} from '@/types/index.d';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/authStore';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(47, 100%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(200, 80%, 50%)',
];

/**
 * Extracts the file extension from a URL, ignoring query parameters.
 * e.g. "https://s3.../file.pdf?X-Amz-Algorithm=..." → "pdf"
 */
function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return ext;
  } catch {
    // fallback: strip query string manually
    const withoutQuery = url.split('?')[0];
    return withoutQuery.split('.').pop()?.toLowerCase() || '';
  }
}

function isImageFile(url: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(getFileExtension(url));
}

function isPdfFile(url: string): boolean {
  return getFileExtension(url) === 'pdf';
}

/**
 * Renders an inline document preview for images, PDFs, or fallback download.
 */
function DocumentPreview({ url, alt }: { url: string; alt: string }) {
  if (isImageFile(url)) {
    return <img src={url} alt={alt} className="w-full h-auto rounded-lg border" />;
  }

  if (isPdfFile(url)) {
    // Use object tag with PDF embed — more reliable than iframe for S3 presigned URLs.
    // Falls back to embedded message if browser can't render inline.
    return (
      <div className="relative w-full h-[70vh] border rounded-lg overflow-hidden bg-white">
        <object
          data={`${url}#toolbar=1&navpanes=0`}
          type="application/pdf"
          className="w-full h-full"
        >
          {/* Fallback if <object> can't render the PDF */}
          <iframe
            src={`${url}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={alt}
          />
        </object>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted">
      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
      <p className="text-base text-muted-foreground mb-4">
        Preview not available for this file type
      </p>
      <Button variant="outline" onClick={() => window.open(url, '_blank')}>
        <Download className="h-4 w-4 mr-2" />
        Download Document
      </Button>
    </div>
  );
}

export default function CompanyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // RBAC: Check permissions + role
  const { hasPermission } = usePermissions();
  const user = useAuthStore((state) => state.user);
  // super_admin and admin bypass RBAC permission checks
  const isSuperAdminOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const canManageCompany = isSuperAdminOrAdmin || hasPermission('UPDATE_COMPANY');

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [isActive, setIsActive] = useState(true);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showGstDocPreview, setShowGstDocPreview] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  // Tab state — defaults to 'verification' when company is pending
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const { data: company, isLoading } = useQuery<ICompany>({
    queryKey: ['company', id],
    queryFn: async () => {
      const response = await http.get(endpoints.company.details(id!));
      const companyData = response.data || response;
      if (companyData) {
        setVerificationStatus(companyData.verificationStatus || 'pending');
        setIsActive(companyData.isActive ?? true);
        setIsVerified(companyData.isVerified ?? false);
        // Auto-navigate to verification tab if company is pending and no tab was explicitly set
        if (companyData.verificationStatus === 'pending' && !searchParams.get('tab')) {
          setSearchParams({ tab: 'verification' }, { replace: true });
        }
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

  // ── Members state & query ──
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);

  const { data: membersData, isLoading: membersLoading } = useQuery<{
    data: IEmployer[];
    message: string;
    pagination: {
      totalEmployers: number;
      pageCount: number;
      currentPage: number;
      hasNextPage: boolean;
    };
  }>({
    queryKey: ['company-members', id, memberSearch, memberPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(memberPage),
        limit: '10',
        companyId: id!,
      });
      if (memberSearch.trim()) params.set('search', memberSearch.trim());
      const response = await http.get(`${endpoints.employer.list}?${params.toString()}`);
      return response as any;
    },
    enabled: !!id && activeTab === 'members',
  });

  const members: IEmployer[] = membersData?.data || [];
  const membersPagination = membersData?.pagination;

  // ── Analytics queries ──
  const { data: dashboardStats, isLoading: dashboardLoading } = useQuery({
    queryKey: ['company-dashboard-stats', id],
    queryFn: async () => {
      const response = await http.get(endpoints.reports.dashboard);
      return response.data || response;
    },
    enabled: !!id && activeTab === 'analytics',
  });

  const { data: jobsOverTimeData } = useQuery({
    queryKey: ['company-jobs-over-time', id],
    queryFn: async () => {
      const response = await http.get(`${endpoints.reports.jobsOverTime}?groupBy=month`);
      return response.data || response || [];
    },
    enabled: !!id && activeTab === 'analytics',
  });

  const { data: applicationsOverTimeData } = useQuery({
    queryKey: ['company-applications-over-time', id],
    queryFn: async () => {
      const response = await http.get(`${endpoints.reports.applicationsOverTime}?groupBy=month`);
      return response.data || response || [];
    },
    enabled: !!id && activeTab === 'analytics',
  });

  const { data: jobCategoriesData } = useQuery({
    queryKey: ['company-job-categories', id],
    queryFn: async () => {
      const response = await http.get(endpoints.reports.jobCategories);
      return response.data || response || [];
    },
    enabled: !!id && activeTab === 'analytics',
  });

  const { data: hiringFunnelData } = useQuery({
    queryKey: ['company-hiring-funnel', id],
    queryFn: async () => {
      const response = await http.get(endpoints.reports.hiringFunnel);
      return response.data || response || {};
    },
    enabled: !!id && activeTab === 'analytics',
  });

  const { data: interviewStatsData } = useQuery({
    queryKey: ['company-interview-stats', id],
    queryFn: async () => {
      const response = await http.get(endpoints.reports.interviewStats);
      return response.data || response || {};
    },
    enabled: !!id && activeTab === 'analytics',
  });

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

  const _handleDelete = () => deleteMutation.mutate();

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
          {canManageCompany && (
            <Button variant="outline" onClick={handleEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {/* Delete hidden: companies should not be deleted from admin panel */}
        </div>
      </div>

      {/* ── Hero Card (Banner + Logo + Quick Info) ── Always visible ── */}
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
                  {verificationStatus === 'verified' ? (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : verificationStatus === 'rejected' ? (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Rejected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
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

      {/* ── Tab Navigation ─────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="verification" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Verification
            {company.verificationStatus === 'pending' && (
              <span className="ml-1 flex h-2 w-2 rounded-full bg-yellow-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-4 w-4" />
            Members
            {membersPagination?.totalEmployers != null && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {membersPagination.totalEmployers}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════ */}
        {/* ── TAB 1: Overview ─────────────────────────────── */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Company Profile */}
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Exact Employee Count
                    </p>
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

          {/* About / Mission / Culture / Benefits */}
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

          {/* Online Presence */}
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
                      <p className="text-sm text-muted-foreground truncate">
                        {company.linkedinUrl}
                      </p>
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
                      <span className="text-sky-700 font-bold text-lg">{'\u{1D54F}'}</span>
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
                      <p className="text-sm text-muted-foreground truncate">
                        {company.facebookUrl}
                      </p>
                    </div>
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* ── TAB 2: Verification ─────────────────────────── */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="verification" className="space-y-6 mt-6">
          {/* Legal & KYC Info */}
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
                    <span className="text-sm font-medium text-muted-foreground">
                      GST Validation
                    </span>
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
                    <span className="text-sm text-green-700 font-medium">
                      KYC Documents Uploaded
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* GST Document Review */}
          {canManageCompany && (company.gstDocumentUrl || company.gstValidationStatus) && (
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
                            <DocumentPreview url={company.gstDocumentUrl} alt="GST document" />
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
                    {verificationStatus !== 'verified' && (
                      <Button
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleApproveCompany}
                        disabled={updateVerificationMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
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

          {/* Verification Document */}
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
                        <DocumentPreview
                          url={company.verificationDocuments}
                          alt="Verification document"
                        />
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

          {/* Admin Controls */}
          {canManageCompany && (
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
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* ── TAB 3: Subscription ─────────────────────────── */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="subscription" className="space-y-6 mt-6">
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
                              ? (subscription.featuredJobsUsed / subscription.featuredJobsLimit) *
                                100
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
                            {subscription.resumeAccessUsed} /{' '}
                            {subscription.resumeAccessLimit ?? '\u221E'}
                          </span>
                        </div>
                        {subscription.resumeAccessLimit ? (
                          <>
                            <Progress
                              value={
                                (subscription.resumeAccessUsed / subscription.resumeAccessLimit) *
                                100
                              }
                              className="h-2"
                            />
                            <p className="text-sm text-muted-foreground">
                              {subscription.resumeAccessLimit - subscription.resumeAccessUsed}{' '}
                              remaining
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
                              {subscription.memberAddingUsed ?? 0} /{' '}
                              {subscription.memberAddingLimit}
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
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* ── TAB 4: Members ──────────────────────────────── */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="members" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Company Members</CardTitle>
                    <CardDescription className="text-sm">
                      Employers and team members associated with this company
                    </CardDescription>
                  </div>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setMemberPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {membersLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-medium">No Members Found</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    {memberSearch
                      ? 'No members match your search criteria.'
                      : 'No employers have been added to this company yet.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Member
                          </th>
                          <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Designation
                          </th>
                          <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Department
                          </th>
                          <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Status
                          </th>
                          <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Joined
                          </th>
                          <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {members.map((member) => (
                          <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                            {/* Name + Email */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                                  {(member.firstName?.[0] || '').toUpperCase()}
                                  {(member.lastName?.[0] || '').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {member.firstName} {member.lastName}
                                  </p>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{member.email}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Designation */}
                            <td className="px-6 py-4">
                              <span className="text-sm">{member.designation || '—'}</span>
                            </td>

                            {/* Department */}
                            <td className="px-6 py-4">
                              <span className="text-sm">{member.department || '—'}</span>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 text-center">
                              <Badge
                                className={
                                  member.isActive
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }
                                variant="outline"
                              >
                                {member.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>

                            {/* Joined date */}
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-muted-foreground">
                                {new Date(member.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="px-6 py-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => navigate(`/members/employers/${member.userId}`)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {membersPagination && membersPagination.pageCount > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing page {membersPagination.currentPage} of{' '}
                        {membersPagination.pageCount} ({membersPagination.totalEmployers} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={memberPage <= 1}
                          onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!membersPagination.hasNextPage}
                          onClick={() => setMemberPage((p) => p + 1)}
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
        </TabsContent>

        {/* ════════════════════════════════════════════════════ */}
        {/* ── TAB 5: Analytics ────────────────────────────── */}
        {/* ════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {/* Stat Cards Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardLoading ? (
              [1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Total Jobs</span>
                      <Briefcase className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold">
                      {dashboardStats?.totalJobs?.toLocaleString() ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Total Applications
                      </span>
                      <FileText className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold">
                      {dashboardStats?.totalApplications?.toLocaleString() ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Interviews</span>
                      <UserCheck className="h-4 w-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold">
                      {interviewStatsData?.totalInterviews?.toLocaleString() ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Members</span>
                      <Users className="h-4 w-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-bold">{membersPagination?.totalEmployers ?? 0}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Jobs & Applications Over Time (Area Chart) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Jobs Posted Over Time</CardTitle>
                    <CardDescription className="text-sm">Monthly job posting trend</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  {Array.isArray(jobsOverTimeData) && jobsOverTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={jobsOverTimeData}>
                        <defs>
                          <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="period"
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <YAxis axisLine={false} tickLine={false} className="text-xs" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          fill="url(#jobsGradient)"
                          strokeWidth={2}
                          name="Jobs"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Applications Over Time</CardTitle>
                    <CardDescription className="text-sm">
                      Monthly application volume trend
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  {Array.isArray(applicationsOverTimeData) &&
                  applicationsOverTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={applicationsOverTimeData}>
                        <defs>
                          <linearGradient id="appsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="period"
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <YAxis axisLine={false} tickLine={false} className="text-xs" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(142, 71%, 45%)"
                          fill="url(#appsGradient)"
                          strokeWidth={2}
                          name="Applications"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hiring Funnel + Job Categories */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hiring Funnel */}
            <Card>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Hiring Funnel</CardTitle>
                    <CardDescription className="text-sm">
                      Conversion across hiring stages
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  {(() => {
                    const funnelStages = [
                      {
                        name: 'Applications',
                        value: hiringFunnelData?.totalApplications ?? 0,
                        color: 'hsl(var(--primary))',
                      },
                      {
                        name: 'Screened',
                        value: hiringFunnelData?.screened ?? 0,
                        color: 'hsl(200, 80%, 50%)',
                      },
                      {
                        name: 'Interviewed',
                        value: hiringFunnelData?.interviewed ?? 0,
                        color: 'hsl(142, 71%, 45%)',
                      },
                      {
                        name: 'Offered',
                        value: hiringFunnelData?.offered ?? 0,
                        color: 'hsl(47, 100%, 50%)',
                      },
                      {
                        name: 'Hired',
                        value: hiringFunnelData?.hired ?? 0,
                        color: 'hsl(280, 65%, 60%)',
                      },
                    ];
                    const hasData = funnelStages.some((s) => s.value > 0);

                    return hasData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelStages} layout="vertical" margin={{ left: 20 }}>
                          <XAxis type="number" axisLine={false} tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            width={100}
                            className="text-xs"
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {funnelStages.map((stage, index) => (
                              <Cell key={index} fill={stage.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No data available
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Job Categories Distribution (Donut) */}
            <Card>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <Briefcase className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Jobs by Category</CardTitle>
                    <CardDescription className="text-sm">
                      Distribution of jobs across categories
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72">
                  {(() => {
                    const catData = Array.isArray(jobCategoriesData)
                      ? jobCategoriesData
                          .slice(0, 6)
                          .map((c: { name?: string; category?: string; count?: number }) => ({
                            name: c.name || c.category || 'Other',
                            value: Number(c.count) || 0,
                          }))
                      : [];
                    return catData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={catData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {catData.map((_: unknown, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value: string) => (
                              <span className="text-xs text-muted-foreground capitalize">
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No data available
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interview Stats Breakdown */}
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                  <UserCheck className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Interview Statistics</CardTitle>
                  <CardDescription className="text-sm">
                    Breakdown by interview status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72">
                {(() => {
                  const interviewBreakdown = [
                    {
                      name: 'Scheduled',
                      value: interviewStatsData?.scheduled ?? 0,
                    },
                    {
                      name: 'Completed',
                      value: interviewStatsData?.completed ?? 0,
                    },
                    {
                      name: 'Cancelled',
                      value: interviewStatsData?.cancelled ?? interviewStatsData?.canceled ?? 0,
                    },
                    {
                      name: 'No Show',
                      value: interviewStatsData?.noShow ?? 0,
                    },
                  ];
                  const hasData = interviewBreakdown.some((s) => s.value > 0);

                  return hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={interviewBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <YAxis axisLine={false} tickLine={false} className="text-xs" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {interviewBreakdown.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No data available
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Usage Summary (if subscription exists) */}
          {subscription && (
            <Card>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                    <CreditCard className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Subscription Usage</CardTitle>
                    <CardDescription className="text-sm">
                      Current plan utilization at a glance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64">
                  {(() => {
                    const usageData = [
                      {
                        name: 'Job Posts',
                        used: subscription.jobPostingUsed ?? 0,
                        limit: subscription.jobPostingLimit ?? 0,
                      },
                      {
                        name: 'Featured',
                        used: subscription.featuredJobsUsed ?? 0,
                        limit: subscription.featuredJobsLimit ?? 0,
                      },
                      {
                        name: 'Resume',
                        used: subscription.resumeAccessUsed ?? 0,
                        limit: subscription.resumeAccessLimit ?? 0,
                      },
                    ].filter((d) => d.limit > 0);

                    return usageData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={usageData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            className="text-xs"
                          />
                          <YAxis axisLine={false} tickLine={false} className="text-xs" />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="used"
                            name="Used"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="limit"
                            name="Limit"
                            fill="hsl(var(--border))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No usage data available
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
function setIsVerified(arg0: any) {
  throw new Error('Function not implemented.');
}
