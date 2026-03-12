import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
  Upload,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import routePath from '@/routes/routePath';
import type { ICompany, CompanySize, CompanyType } from '@/types/index';

interface CompanyFormData {
  name: string;
  tagline?: string;
  description?: string;
  mission?: string;
  culture?: string;
  benefits?: string;
  industry?: string;
  companySize?: CompanySize;
  companyType?: CompanyType;
  yearEstablished?: number;
  website?: string;
  headquarters?: string;
  employeeCount?: number;
  logoUrl?: string;
  bannerUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  panNumber?: string;
  gstNumber?: string;
  cinNumber?: string;
}

interface CompanyApiResponse {
  data: ICompany[];
  pagination: {
    totalCompanies: number;
    pageCount: number;
    currentPage: number;
    hasNextPage: boolean;
  };
}

const COMPANY_SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '500+'];
const COMPANY_TYPES: CompanyType[] = ['startup', 'sme', 'mnc', 'government'];

const initialFormData: CompanyFormData = {
  name: '',
  tagline: '',
  description: '',
  mission: '',
  culture: '',
  benefits: '',
  industry: '',
  companySize: undefined,
  companyType: undefined,
  yearEstablished: undefined,
  website: '',
  headquarters: '',
  employeeCount: undefined,
  logoUrl: '',
  bannerUrl: '',
  linkedinUrl: '',
  twitterUrl: '',
  facebookUrl: '',
  panNumber: '',
  gstNumber: '',
  cinNumber: '',
};

// Helper function to clean form data before sending to API
const cleanFormData = (data: CompanyFormData) => {
  const cleaned: Record<string, unknown> = { ...data } as unknown as Record<string, unknown>;

  // Remove fields that shouldn't be in the DTO
  delete cleaned.slug;
  delete cleaned.location;
  delete cleaned.employerId;

  // Remove empty strings and undefined values
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === '' || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

export default function CompaniesListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search input by 500ms
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [editingCompany, setEditingCompany] = useState<ICompany | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [verificationDocFile, setVerificationDocFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [verificationDocPreview, setVerificationDocPreview] = useState<string | null>(null);

  // Fetch companies list with pagination (uses debounced search to reduce API calls)
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies', page, limit, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      });
      const response = await http.get(`${endpoints.company.list}?${params}`);
      return response as unknown as CompanyApiResponse;
    },
  });

  const companies: ICompany[] = companiesData?.data || [];
  const pagination = companiesData?.pagination;
  const total = pagination?.totalCompanies || 0;
  const totalPages = pagination?.pageCount || 1;
  const currentPage = pagination?.currentPage || page;
  const hasNextPage = pagination?.hasNextPage || false;

  // Handle edit query parameter from details page
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && companies.length > 0) {
      const companyToEdit = companies.find((c) => c.id === editId);
      if (companyToEdit) {
        handleEdit(companyToEdit);
        // Clear the query parameter
        searchParams.delete('edit');
        setSearchParams(searchParams);
      } else {
        // If company not found in current page, fetch it directly
        http
          .get(endpoints.company.details(editId))
          .then((response) => {
            const company = response.data || response;
            handleEdit(company);
            searchParams.delete('edit');
            setSearchParams(searchParams);
          })
          .catch(() => {
            toast.error('Company not found');
            searchParams.delete('edit');
            setSearchParams(searchParams);
          });
      }
    }
  }, [searchParams, companies]);

  // Helper function to upload logo/banner
  const uploadCompanyImage = async (companyId: string, file: File, type: 'logo' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint =
      type === 'logo'
        ? endpoints.company.uploadLogo(companyId)
        : endpoints.company.uploadBanner(companyId);

    return await http.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  // Helper function to upload verification document
  const uploadVerificationDocument = async (companyId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return await http.post(endpoints.company.uploadVerificationDocument(companyId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  // Create company mutation
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
    mutationFn: async (data: CompanyFormData) => {
      // Build FormData for multipart/form-data request
      const formData = new FormData();

      // Append all text fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      // Append file fields if they exist
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (bannerFile) {
        formData.append('banner', bannerFile);
      }
      if (verificationDocFile) {
        formData.append('verificationDocument', verificationDocFile);
      }

      // Send as multipart/form-data (backend will detect content-type and handle files)
      const response = await http.post(endpoints.company.create, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created successfully');
      setIsCreateOpen(false);
      setFormData(initialFormData);
      setLogoFile(null);
      setBannerFile(null);
      setVerificationDocFile(null);
      setLogoPreview(null);
      setBannerPreview(null);
      setVerificationDocPreview(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create company');
    },
  });

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyFormData }) => {
      const cleanedData = cleanFormData(data);
      const response = await http.put(endpoints.company.update(id), cleanedData);

      // Upload logo and banner if new files are selected
      if (logoFile) {
        await uploadCompanyImage(id, logoFile, 'logo');
      }
      if (bannerFile) {
        await uploadCompanyImage(id, bannerFile, 'banner');
      }
      // Upload verification document if new file is selected
      if (verificationDocFile) {
        await uploadVerificationDocument(id, verificationDocFile);
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company updated successfully');
      setIsEditOpen(false);
      setEditingCompany(null);
      setFormData(initialFormData);
      setLogoFile(null);
      setBannerFile(null);
      setVerificationDocFile(null);
      setLogoPreview(null);
      setBannerPreview(null);
      setVerificationDocPreview(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to update company');
    },
  });

  // Delete company mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.company.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deactivated successfully');
      setDeleteCompanyId(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to deactivate company');
    },
  });

  // Throttled create handler - prevents double-click submissions (2 second delay)
  const handleCreate = useThrottle(() => {
    if (!formData.name.trim()) {
      toast.error('Please enter company name');
      return;
    }
    createMutation.mutate(formData);
  }, 2000);

  const handleEdit = (company: ICompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      tagline: company.tagline || '',
      description: company.description || '',
      mission: company.mission || '',
      culture: company.culture || '',
      benefits: company.benefits || '',
      industry: company.industry || '',
      companySize: company.companySize,
      companyType: company.companyType,
      yearEstablished: company.yearEstablished || undefined,
      website: company.website || '',
      headquarters: company.headquarters || '',
      employeeCount: company.employeeCount || undefined,
      logoUrl: company.logoUrl || '',
      bannerUrl: company.bannerUrl || '',
      linkedinUrl: company.linkedinUrl || '',
      twitterUrl: company.twitterUrl || '',
      facebookUrl: company.facebookUrl || '',
      panNumber: company.panNumber || '',
      gstNumber: company.gstNumber || '',
      cinNumber: company.cinNumber || '',
    });
    // Set preview to existing URLs
    setLogoPreview(company.logoUrl || null);
    setBannerPreview(company.bannerUrl || null);
    setVerificationDocPreview(company.verificationDocuments || null);
    setLogoFile(null);
    setBannerFile(null);
    setVerificationDocFile(null);
    setIsEditOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed');
      return;
    }

    // Validate file size (2MB for logo)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed');
      return;
    }

    // Validate file size (5MB for banner)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    setBannerFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
  };

  const handleVerificationDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, PDF, DOC, DOCX are allowed');
      return;
    }

    // Validate file size (10MB for verification documents)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setVerificationDocFile(file);

    // Create preview for images, show filename for documents
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationDocPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setVerificationDocPreview(file.name);
    }
  };

  const clearVerificationDoc = () => {
    setVerificationDocFile(null);
    setVerificationDocPreview(null);
  };

  // Throttled update handler - prevents double-click submissions (2 second delay)
  const handleUpdate = useThrottle(() => {
    if (!editingCompany) return;
    if (!formData.name.trim()) {
      toast.error('Please enter company name');
      return;
    }
    updateMutation.mutate({ id: editingCompany.id, data: formData });
  }, 2000);

  // Throttled delete handler - prevents accidental double-clicks (2 second delay)
  const handleDelete = useThrottle((id: string) => {
    deleteMutation.mutate(id);
  }, 2000);

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setFormData(initialFormData);
    setLogoFile(null);
    setBannerFile(null);
    setVerificationDocFile(null);
    setLogoPreview(null);
    setBannerPreview(null);
    setVerificationDocPreview(null);
  };

  const handleCloseEditDialog = () => {
    setIsEditOpen(false);
    setEditingCompany(null);
    setFormData(initialFormData);
    setLogoFile(null);
    setBannerFile(null);
    setVerificationDocFile(null);
    setLogoPreview(null);
    setBannerPreview(null);
    setVerificationDocPreview(null);
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

  const activeCompanies = companies.filter((c: ICompany) => c.isActive).length;
  const verifiedCompanies = companies.filter((c: ICompany) => c.isVerified).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies Management</h1>
          <p className="text-muted-foreground">Manage company profiles and information</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>Add a new company profile to the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Acme Corporation"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={formData.tagline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      placeholder="Building the future of technology"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, industry: e.target.value }))
                      }
                      placeholder="Technology"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyType">Company Type</Label>
                    <Select
                      value={formData.companyType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, companyType: value as CompanyType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, companySize: value as CompanySize }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size} employees
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="employeeCount">Employee Count</Label>
                    <Input
                      id="employeeCount"
                      type="number"
                      value={formData.employeeCount || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          employeeCount: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearEstablished">Year Established</Label>
                    <Input
                      id="yearEstablished"
                      type="number"
                      value={formData.yearEstablished || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          yearEstablished: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      placeholder="2020"
                      min="1800"
                      max="2100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="headquarters">Headquarters</Label>
                    <Input
                      id="headquarters"
                      value={formData.headquarters}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, headquarters: e.target.value }))
                      }
                      placeholder="Mumbai, India"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, website: e.target.value }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Media Upload */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Company Media</h3>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Company Logo (JPEG, PNG, WebP - Max 2MB)</Label>
                  <div className="flex items-start gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-24 w-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={clearLogo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 border-2 border-dashed rounded flex items-center justify-center bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload company logo (square recommended)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label>Company Banner (JPEG, PNG, WebP - Max 5MB)</Label>
                  <div className="flex items-start gap-4">
                    {bannerPreview ? (
                      <div className="relative">
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="h-24 w-48 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={clearBanner}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-24 w-48 border-2 border-dashed rounded flex items-center justify-center bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="banner-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBannerChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload company banner (wide format recommended)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Company */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">About Company</h3>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe the company..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="mission">Mission</Label>
                  <Textarea
                    id="mission"
                    value={formData.mission}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mission: e.target.value }))}
                    placeholder="Company mission statement..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="culture">Culture</Label>
                  <Textarea
                    id="culture"
                    value={formData.culture}
                    onChange={(e) => setFormData((prev) => ({ ...prev, culture: e.target.value }))}
                    placeholder="Company culture and values..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="benefits">Benefits</Label>
                  <Textarea
                    id="benefits"
                    value={formData.benefits}
                    onChange={(e) => setFormData((prev) => ({ ...prev, benefits: e.target.value }))}
                    placeholder="Benefits offered to employees..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Social Media</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      value={formData.linkedinUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))
                      }
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterUrl">Twitter URL</Label>
                    <Input
                      id="twitterUrl"
                      value={formData.twitterUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, twitterUrl: e.target.value }))
                      }
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <Input
                      id="facebookUrl"
                      value={formData.facebookUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, facebookUrl: e.target.value }))
                      }
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* KYC Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">KYC Information (India)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      value={formData.panNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, panNumber: e.target.value }))
                      }
                      placeholder="ABCDE1234F"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={formData.gstNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, gstNumber: e.target.value }))
                      }
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cinNumber">CIN Number</Label>
                    <Input
                      id="cinNumber"
                      value={formData.cinNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cinNumber: e.target.value }))
                      }
                      placeholder="U12345MH2020PTC123456"
                      maxLength={25}
                    />
                  </div>
                </div>

                {/* Business Verification Document Upload */}
                <div className="space-y-2">
                  <Label>Business Verification (KYC/PAN/GST Upload)</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload business verification document (JPG, PNG, PDF, DOC, DOCX - Max 10MB)
                  </p>
                  <div className="flex items-start gap-4">
                    {verificationDocPreview ? (
                      <div className="relative">
                        {verificationDocFile && verificationDocFile.type.startsWith('image/') ? (
                          <img
                            src={verificationDocPreview}
                            alt="Verification document preview"
                            className="h-24 w-24 object-cover rounded border"
                          />
                        ) : (
                          <div className="h-24 w-48 border-2 rounded flex items-center justify-center bg-muted p-2">
                            <p className="text-xs text-center break-all">
                              {verificationDocPreview}
                            </p>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={clearVerificationDoc}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-24 w-48 border-2 border-dashed rounded flex items-center justify-center bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="verification-doc-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleVerificationDocChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload KYC/PAN/GST verification document
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Company'}
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
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompanies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCompanies}</div>
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
                placeholder="Search companies by name, industry, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies List</CardTitle>
          <CardDescription>View and manage all company profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No companies found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Headquarters</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company: ICompany) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(routePath.COMPANY.DETAILS.replace(':id', company.id))}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{company.name}</div>
                            {company.tagline && (
                              <div className="text-xs text-muted-foreground">{company.tagline}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{company.industry || 'N/A'}</TableCell>
                      <TableCell className="capitalize">{company.companyType || 'N/A'}</TableCell>
                      <TableCell>{company.headquarters || 'N/A'}</TableCell>
                      <TableCell>{company.companySize || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(company.isVerified)}</TableCell>
                      <TableCell>{formatDate(company.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(company);
                            }}
                            title="Edit company"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCompanyId(company.id);
                            }}
                            title="Delete company"
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
                    Showing {(currentPage - 1) * limit + 1} to{' '}
                    {Math.min(currentPage * limit, total)} of {total} companies
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
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
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-name">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-tagline">Tagline</Label>
                  <Input
                    id="edit-tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Building the future of technology"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-industry">Industry</Label>
                  <Input
                    id="edit-industry"
                    value={formData.industry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                    placeholder="Technology"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-companyType">Company Type</Label>
                  <Select
                    value={formData.companyType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, companyType: value as CompanyType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-companySize">Company Size</Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, companySize: value as CompanySize }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size} employees
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-employeeCount">Employee Count</Label>
                  <Input
                    id="edit-employeeCount"
                    type="number"
                    value={formData.employeeCount || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        employeeCount: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    placeholder="150"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-yearEstablished">Year Established</Label>
                  <Input
                    id="edit-yearEstablished"
                    type="number"
                    value={formData.yearEstablished || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        yearEstablished: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    placeholder="2020"
                    min="1800"
                    max="2100"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-headquarters">Headquarters</Label>
                  <Input
                    id="edit-headquarters"
                    value={formData.headquarters}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, headquarters: e.target.value }))
                    }
                    placeholder="Mumbai, India"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Company Media</h3>
              <div className="space-y-2">
                <Label>Logo</Label>
                {(logoPreview || formData.logoUrl) && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                    <img
                      src={logoPreview || formData.logoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-logo-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {(logoFile || formData.logoUrl) && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearLogo}>
                      Clear
                    </Button>
                  )}
                </div>
                <input
                  id="edit-logo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 2MB.</p>
              </div>
              <div className="space-y-2">
                <Label>Banner</Label>
                {(bannerPreview || formData.bannerUrl) && (
                  <div className="relative w-full h-32 border rounded-lg overflow-hidden">
                    <img
                      src={bannerPreview || formData.bannerUrl}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-banner-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Banner
                  </Button>
                  {(bannerFile || formData.bannerUrl) && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearBanner}>
                      Clear
                    </Button>
                  )}
                </div>
                <input
                  id="edit-banner-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleBannerChange}
                />
                <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 5MB.</p>
              </div>
            </div>

            {/* About Company */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">About Company</h3>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the company..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-mission">Mission</Label>
                <Textarea
                  id="edit-mission"
                  value={formData.mission}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mission: e.target.value }))}
                  placeholder="Company mission statement..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="edit-culture">Culture</Label>
                <Textarea
                  id="edit-culture"
                  value={formData.culture}
                  onChange={(e) => setFormData((prev) => ({ ...prev, culture: e.target.value }))}
                  placeholder="Company culture and values..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="edit-benefits">Benefits</Label>
                <Textarea
                  id="edit-benefits"
                  value={formData.benefits}
                  onChange={(e) => setFormData((prev) => ({ ...prev, benefits: e.target.value }))}
                  placeholder="Benefits offered to employees..."
                  rows={2}
                />
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Social Media</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="edit-linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))
                    }
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-twitterUrl">Twitter URL</Label>
                  <Input
                    id="edit-twitterUrl"
                    value={formData.twitterUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, twitterUrl: e.target.value }))
                    }
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-facebookUrl">Facebook URL</Label>
                  <Input
                    id="edit-facebookUrl"
                    value={formData.facebookUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, facebookUrl: e.target.value }))
                    }
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>
            </div>

            {/* KYC Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">KYC Information (India)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-panNumber">PAN Number</Label>
                  <Input
                    id="edit-panNumber"
                    value={formData.panNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, panNumber: e.target.value }))
                    }
                    placeholder="ABCDE1234F"
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-gstNumber">GST Number</Label>
                  <Input
                    id="edit-gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, gstNumber: e.target.value }))
                    }
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cinNumber">CIN Number</Label>
                  <Input
                    id="edit-cinNumber"
                    value={formData.cinNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cinNumber: e.target.value }))
                    }
                    placeholder="U12345MH2020PTC123456"
                    maxLength={25}
                  />
                </div>
              </div>

              {/* Business Verification Document Upload */}
              <div className="space-y-2">
                <Label>Business Verification (KYC/PAN/GST Upload)</Label>
                <p className="text-xs text-muted-foreground">
                  Upload business verification document (JPG, PNG, PDF, DOC, DOCX - Max 10MB)
                </p>
                {verificationDocPreview && (
                  <div className="relative w-full max-w-md">
                    {verificationDocFile && verificationDocFile.type.startsWith('image/') ? (
                      <img
                        src={verificationDocPreview}
                        alt="Verification document preview"
                        className="h-32 w-full object-contain border rounded-lg"
                      />
                    ) : (
                      <div className="h-24 w-full border-2 rounded flex items-center justify-center bg-muted p-2">
                        <p className="text-xs text-center break-all">{verificationDocPreview}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-verification-doc-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  {(verificationDocFile || editingCompany?.verificationDocuments) && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearVerificationDoc}>
                      Clear
                    </Button>
                  )}
                </div>
                <input
                  id="edit-verification-doc-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleVerificationDocChange}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, PDF, DOC, or DOCX. Max 10MB.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Company'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCompanyId} onOpenChange={() => setDeleteCompanyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this company? This action will mark the company as
              inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCompanyId && handleDelete(deleteCompanyId)}
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
