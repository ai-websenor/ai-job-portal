import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Building2,
  Globe,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  Upload,
  Info,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import routePath from '@/routes/routePath';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ICompany, ApiResponse, CompanySize } from '@/types/index.d';

type AdminCompanyFormData = Partial<
  Omit<
    ICompany,
    | 'id'
    | 'userId'
    | 'name'
    | 'companyType'
    | 'createdAt'
    | 'updatedAt'
    | 'panNumber'
    | 'gstNumber'
    | 'cinNumber'
    | 'logoUrl'
    | 'verificationDocuments'
    | 'kycDocuments'
    | 'isVerified'
    | 'verificationStatus'
  >
>;

export default function AdminCompanyProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AdminCompanyFormData>({});
  const [_logoFile, setLogoFile] = useState<File | null>(null);
  const [_bannerFile, setBannerFile] = useState<File | null>(null);

  // Fetch admin's company profile
  const { data: company, isLoading } = useQuery<ICompany>({
    queryKey: ['adminCompanyProfile'],
    queryFn: async () => {
      const response = await http.get(endpoints.company.adminProfile);
      return response.data || response;
    },
  });

  // Update form data when company data loads
  useEffect(() => {
    if (company) {
      setFormData({
        tagline: company.tagline || '',
        industry: company.industry || '',
        companySize: company.companySize || undefined,
        yearEstablished: company.yearEstablished || undefined,
        website: company.website || '',
        description: company.description || '',
        mission: company.mission || '',
        culture: company.culture || '',
        benefits: company.benefits || '',
        headquarters: company.headquarters || '',
        employeeCount: company.employeeCount || undefined,
        linkedinUrl: company.linkedinUrl || '',
        twitterUrl: company.twitterUrl || '',
        facebookUrl: company.facebookUrl || '',
        bannerUrl: company.bannerUrl || '',
        isActive: company.isActive ?? true,
      });
    }
  }, [company]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AdminCompanyFormData) => {
      return await http.put(endpoints.company.updateAdminProfile, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCompanyProfile'] });
      setIsEditing(false);
      toast.success('Company profile updated successfully');
    },
    onError: (error: unknown) => {
      toast.error((error as ApiResponse)?.message || 'Failed to update company profile');
    },
  });

  // Logo upload mutation
  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return await http.post(endpoints.company.uploadLogo(company!.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCompanyProfile'] });
      setLogoFile(null);
      toast.success('Logo uploaded successfully');
    },
    onError: (error: unknown) => {
      toast.error((error as ApiResponse)?.message || 'Failed to upload logo');
    },
  });

  // Banner upload mutation
  const bannerMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return await http.post(endpoints.company.uploadBanner(company!.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCompanyProfile'] });
      setBannerFile(null);
      toast.success('Banner uploaded successfully');
    },
    onError: (error: unknown) => {
      toast.error((error as ApiResponse)?.message || 'Failed to upload banner');
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (company) {
      setFormData({
        tagline: company.tagline,
        industry: company.industry,
        companySize: company.companySize,
        yearEstablished: company.yearEstablished,
        website: company.website,
        description: company.description,
        mission: company.mission,
        culture: company.culture,
        benefits: company.benefits,
        headquarters: company.headquarters,
        employeeCount: company.employeeCount,
        linkedinUrl: company.linkedinUrl,
        twitterUrl: company.twitterUrl,
        facebookUrl: company.facebookUrl,
        bannerUrl: company.bannerUrl,
        isActive: company.isActive,
      });
    }
    setIsEditing(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo file size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      logoMutation.mutate(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Banner file size must be less than 5MB');
        return;
      }
      setBannerFile(file);
      bannerMutation.mutate(file);
    }
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
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No company assigned to your account. Please contact your super admin.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(routePath.DASHBOARD)}
            >
              Back to Dashboard
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
          <Button variant="ghost" size="icon" onClick={() => navigate(routePath.DASHBOARD)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Company Profile</h1>
            <p className="text-muted-foreground">View and manage your company information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Alert */}
      {isEditing && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Some sensitive fields (PAN, GST, CIN, verification documents)
            cannot be edited. Contact your super admin if changes are needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Banner and Logo */}
      <Card>
        <CardContent className="p-0">
          {company.bannerUrl && (
            <div className="w-full h-48 bg-muted overflow-hidden rounded-t-lg relative group">
              <img
                src={company.bannerUrl}
                alt={`${company.name} banner`}
                className="w-full h-full object-cover"
              />
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label htmlFor="banner-upload" className="cursor-pointer">
                    <Button variant="secondary" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Change Banner
                      </span>
                    </Button>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBannerUpload}
                      disabled={bannerMutation.isPending}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
          <div className="p-6 flex items-start gap-6">
            {company.logoUrl ? (
              <div className="w-24 h-24 bg-white border rounded-lg overflow-hidden flex-shrink-0 relative group">
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="w-full h-full object-contain"
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <Button variant="secondary" size="sm" asChild>
                        <span>
                          <Upload className="h-3 w-3" />
                        </span>
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoUpload}
                        disabled={logoMutation.isPending}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div>
                    <h2 className="text-2xl font-bold">{company.name}</h2>
                    {isEditing ? (
                      <Input
                        value={formData.tagline || ''}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        className="text-muted-foreground mt-1"
                        placeholder="Company tagline"
                      />
                    ) : (
                      company.tagline && (
                        <p className="text-muted-foreground mt-1">{company.tagline}</p>
                      )
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {company.isVerified && (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {company.isActive ? (
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
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                placeholder="Company description"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.description || 'No description provided'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Company Type - Read-only */}
            {company.companyType && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Company Type</span>
                <span className="text-sm font-medium capitalize">{company.companyType}</span>
              </div>
            )}

            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select
                    value={formData.companySize || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, companySize: value as CompanySize })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Employee Count</Label>
                  <Input
                    type="number"
                    value={formData.employeeCount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employeeCount: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="e.g. 150"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Information Technology"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Year Established</Label>
                  <Input
                    type="number"
                    value={formData.yearEstablished || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        yearEstablished: parseInt(e.target.value) || undefined,
                      })
                    }
                    placeholder="e.g. 2020"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Headquarters</Label>
                  <Input
                    value={formData.headquarters || ''}
                    onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                    placeholder="e.g. Bangalore, Karnataka, India"
                  />
                </div>

                <Separator />

                {/* Read-only fields */}
                {company.slug && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Slug</span>
                    <span className="text-sm font-medium font-mono">{company.slug}</span>
                  </div>
                )}
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
              </>
            ) : (
              <>
                {company.employeeCount !== undefined && (
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Mission */}
        <Card>
          <CardHeader>
            <CardTitle>Mission</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.mission || ''}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                rows={4}
                placeholder="Company mission statement"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.mission || 'No mission statement provided'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Culture */}
        <Card>
          <CardHeader>
            <CardTitle>Culture</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.culture || ''}
                onChange={(e) => setFormData({ ...formData, culture: e.target.value })}
                rows={4}
                placeholder="Company culture description"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.culture || 'No culture description provided'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.benefits || ''}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                rows={3}
                placeholder="Employee benefits"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {company.benefits || 'No benefits listed'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    type="url"
                    value={formData.linkedinUrl || ''}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter URL</Label>
                  <Input
                    type="url"
                    value={formData.twitterUrl || ''}
                    onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input
                    type="url"
                    value={formData.facebookUrl || ''}
                    onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </>
            ) : (
              <>
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
                {!company.linkedinUrl && !company.twitterUrl && !company.facebookUrl && (
                  <p className="text-sm text-muted-foreground">No social media links provided</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* KYC Information (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Information</CardTitle>
            <CardDescription>These fields are managed by your super admin</CardDescription>
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
            {company.kycDocuments && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>KYC Documents Submitted</span>
                </div>
              </>
            )}
            {company.verificationStatus && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Verification Status</span>
                <Badge
                  variant={
                    company.verificationStatus === 'verified'
                      ? 'default'
                      : company.verificationStatus === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="capitalize"
                >
                  {company.verificationStatus}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
