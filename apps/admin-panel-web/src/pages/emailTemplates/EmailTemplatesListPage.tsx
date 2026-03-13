/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Upload,
  X,
  Loader2,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import { useRef } from 'react';

interface IEmailTemplate {
  id: string;
  templateKey: string;
  name: string;
  subject: string;
  title: string;
  content: string;
  ctaText: string | null;
  ctaUrl: string | null;
  bannerImageUrl: string | null;
  variables: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailTemplatesResponse {
  message: string;
  data: IEmailTemplate[];
  pagination: {
    totalEmailTemplate: number;
    pageCount: number;
    currentPage: number;
    hasNextPage: boolean;
  };
}

interface PreviewResponse {
  message: string;
  data: {
    subject: string;
    html: string;
    bannerImageUrl: string | null;
  };
}

const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'WELCOME', label: 'Authentication' },
  { value: 'APPLICATION', label: 'Applications' },
  { value: 'INTERVIEW', label: 'Interviews' },
  { value: 'JOB', label: 'Jobs' },
  { value: 'SUBSCRIPTION', label: 'Billing' },
  { value: 'ACCOUNT', label: 'Platform' },
  { value: 'PAYMENT', label: 'Payments' },
];

const EmailTemplatesListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<IEmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBannerUrl, setPreviewBannerUrl] = useState<string | null>(null);

  // Banner upload states
  const createBannerInputRef = useRef<HTMLInputElement>(null);
  const editBannerInputRef = useRef<HTMLInputElement>(null);
  const [createBannerPreview, setCreateBannerPreview] = useState<string | null>(null);
  const [createBannerFile, setCreateBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);

  // Form state for create
  const [formData, setFormData] = useState({
    templateKey: '',
    name: '',
    subject: '',
    title: '',
    content: '',
    ctaText: '',
    ctaUrl: '',
    variables: '',
  });

  // Form state for edit
  const [editFormData, setEditFormData] = useState({
    name: '',
    subject: '',
    title: '',
    content: '',
    ctaText: '',
    ctaUrl: '',
    variables: '',
    isActive: true,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  // Fetch templates
  const { data, isLoading, error } = useQuery({
    queryKey: ['emailTemplates', page, limit, debouncedSearch, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter === 'active') params.set('isActive', 'true');
      if (statusFilter === 'inactive') params.set('isActive', 'false');
      const response = await http.get(`${endpoints.emailTemplates.list}?${params}`);
      return response as unknown as EmailTemplatesResponse;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await http.post(endpoints.emailTemplates.create, payload);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailTemplates'] });
      toast.success('Email template created successfully');
      setAddDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create template');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      return await http.put(endpoints.emailTemplates.update(id), payload);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailTemplates'] });
      toast.success('Email template updated successfully');
      setEditDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update template');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.emailTemplates.delete(id));
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailTemplates'] });
      toast.success('Email template deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete template');
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await http.post(
        endpoints.emailTemplates.preview(id),
        {},
      )) as unknown as PreviewResponse;
    },
    onSuccess: (response: PreviewResponse) => {
      setPreviewHtml(response.data.html);
      setPreviewSubject(response.data.subject);
      setPreviewBannerUrl(response.data.bannerImageUrl);
      setPreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate preview');
    },
  });

  // Banner upload mutation
  const bannerUploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return await http.post(endpoints.emailTemplates.uploadBanner(id), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailTemplates'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload banner image');
    },
  });

  // Delete banner mutation
  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.emailTemplates.deleteBanner(id));
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['emailTemplates'] });
      toast.success('Banner image deleted');
      setEditBannerPreview(null);
      // Update selected template locally
      if (selectedTemplate) {
        setSelectedTemplate({ ...selectedTemplate, bannerImageUrl: null });
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete banner');
    },
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      return await http.post(endpoints.emailTemplates.seed, {});
    },
    onSuccess: (response: any) => {
      queryClient.refetchQueries({ queryKey: ['emailTemplates'] });
      toast.success(response?.message || 'Templates seeded successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to seed templates');
    },
  });

  const resetCreateForm = () => {
    setFormData({
      templateKey: '',
      name: '',
      subject: '',
      title: '',
      content: '',
      ctaText: '',
      ctaUrl: '',
      variables: '',
    });
    setCreateBannerPreview(null);
    setCreateBannerFile(null);
  };

  const validateBannerFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB');
      return false;
    }
    return true;
  };

  const handleCreateBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateBannerFile(file)) return;
    const reader = new FileReader();
    reader.onload = () => setCreateBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
    setCreateBannerFile(file);
    if (createBannerInputRef.current) createBannerInputRef.current.value = '';
  };

  const handleEditBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !validateBannerFile(file) || !selectedTemplate) return;
    const reader = new FileReader();
    reader.onload = () => setEditBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
    bannerUploadMutation.mutate({ id: selectedTemplate.id, file });
    if (editBannerInputRef.current) editBannerInputRef.current.value = '';
  };

  const handleCreateSubmit = () => {
    if (
      !formData.templateKey.trim() ||
      !formData.name.trim() ||
      !formData.subject.trim() ||
      !formData.title.trim() ||
      !formData.content.trim()
    ) {
      toast.error('Please fill in all required fields');
      return;
    }
    const payload: any = {
      templateKey: formData.templateKey.trim().toUpperCase(),
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      title: formData.title.trim(),
      content: formData.content.trim(),
    };
    if (formData.ctaText.trim()) payload.ctaText = formData.ctaText.trim();
    if (formData.ctaUrl.trim()) payload.ctaUrl = formData.ctaUrl.trim();
    if (formData.variables.trim()) {
      payload.variables = formData.variables
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean);
    }
    createMutation.mutate(payload, {
      onSuccess: (response: any) => {
        // Upload banner after template is created
        if (createBannerFile && response?.data?.id) {
          bannerUploadMutation.mutate({ id: response.data.id, file: createBannerFile });
        }
      },
    });
  };

  const handleEditOpen = (template: IEmailTemplate) => {
    setSelectedTemplate(template);
    setEditBannerPreview(null);
    setEditFormData({
      name: template.name,
      subject: template.subject,
      title: template.title,
      content: template.content,
      ctaText: template.ctaText || '',
      ctaUrl: template.ctaUrl || '',
      variables: (template.variables || []).join(', '),
      isActive: template.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedTemplate) return;
    if (
      !editFormData.name.trim() ||
      !editFormData.subject.trim() ||
      !editFormData.title.trim() ||
      !editFormData.content.trim()
    ) {
      toast.error('Please fill in all required fields');
      return;
    }
    const payload: any = {
      id: selectedTemplate.id,
      name: editFormData.name.trim(),
      subject: editFormData.subject.trim(),
      title: editFormData.title.trim(),
      content: editFormData.content.trim(),
      isActive: editFormData.isActive,
    };
    if (editFormData.ctaText.trim()) payload.ctaText = editFormData.ctaText.trim();
    else payload.ctaText = null;
    if (editFormData.ctaUrl.trim()) payload.ctaUrl = editFormData.ctaUrl.trim();
    else payload.ctaUrl = null;
    if (editFormData.variables.trim()) {
      payload.variables = editFormData.variables
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean);
    } else {
      payload.variables = [];
    }
    updateMutation.mutate(payload);
  };

  const handleDeleteOpen = (template: IEmailTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedTemplate) return;
    deleteMutation.mutate(selectedTemplate.id);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <XCircle className="mr-1 h-3 w-3" />
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

  const templates = data?.data || [];
  const totalTemplates = data?.pagination?.totalEmailTemplate || 0;
  const totalPages = data?.pagination?.pageCount || 1;
  const currentPage = data?.pagination?.currentPage || 1;

  const activeCount = templates.filter((t) => t.isActive).length;
  const inactiveCount = templates.filter((t) => !t.isActive).length;

  // Filter by category on client side
  const filteredTemplates =
    categoryFilter === 'all'
      ? templates
      : templates.filter((t) => t.templateKey.includes(categoryFilter));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage email templates for all platform notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{totalTemplates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{inactiveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, key, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates List</CardTitle>
          <CardDescription>
            {totalTemplates} template{totalTemplates !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load templates. Please try again.
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No templates found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Seed default templates or add a new one'}
              </p>
              {!search && statusFilter === 'all' && categoryFilter === 'all' && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" onClick={() => seedMutation.mutate()}>
                    Seed Defaults
                  </Button>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Template Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template, index) => (
                    <TableRow key={template.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {template.templateKey}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {template.subject}
                      </TableCell>
                      <TableCell>{getStatusBadge(template.isActive)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(template.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => previewMutation.mutate(template.id)}
                            disabled={previewMutation.isPending}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOpen(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOpen(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} &mdash; {totalTemplates} total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data?.pagination?.hasNextPage}
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

      {/* Create Template Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Email Template</DialogTitle>
            <DialogDescription>
              Create a new email template. Content will be rendered inside the fixed master email
              layout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Template Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. WELCOME_CANDIDATE"
                  value={formData.templateKey}
                  onChange={(e) =>
                    setFormData({ ...formData, templateKey: e.target.value.toUpperCase() })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (UPPER_SNAKE_CASE)
                </p>
              </div>
              <div className="space-y-2">
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Welcome Candidate"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Welcome to {{platformName}}, {{firstName}}!"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Welcome Aboard!"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Heading displayed in the email body</p>
            </div>
            <div className="space-y-2">
              <Label>
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Email body text. Use {{variableName}} for dynamic content."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input
                  placeholder="e.g. Complete Your Profile"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Button URL</Label>
                <Input
                  placeholder="e.g. {{actionUrl}}"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <p className="text-xs text-muted-foreground">
                Recommended: 600x200px (3:1 ratio), max 2MB. JPEG, PNG, or WebP.
              </p>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px]">
                {createBannerPreview ? (
                  <div className="relative group w-full">
                    <img
                      src={createBannerPreview}
                      alt="Banner preview"
                      className="max-h-[120px] w-full object-contain rounded"
                    />
                    <button
                      onClick={() => {
                        setCreateBannerPreview(null);
                        setCreateBannerFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">No banner image</p>
                  </div>
                )}
              </div>
              <input
                ref={createBannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCreateBannerChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => createBannerInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {createBannerPreview ? 'Replace Banner' : 'Upload Banner'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                600 x 200 px &middot; 3:1 ratio &middot; Max 2MB
              </p>
            </div>
            <div className="space-y-2">
              <Label>Variables</Label>
              <Input
                placeholder="firstName, jobTitle, companyName, actionUrl"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of variable names used in the template
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetCreateForm();
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Update template content. The template key cannot be changed.
              {selectedTemplate && (
                <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                  {selectedTemplate.templateKey}
                </code>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editFormData.subject}
                onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input
                  value={editFormData.ctaText}
                  onChange={(e) => setEditFormData({ ...editFormData, ctaText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Button URL</Label>
                <Input
                  value={editFormData.ctaUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, ctaUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <p className="text-xs text-muted-foreground">
                Recommended: 600x200px (3:1 ratio), max 2MB. JPEG, PNG, or WebP.
              </p>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 flex flex-col items-center justify-center min-h-[100px] relative">
                {editBannerPreview || selectedTemplate?.bannerImageUrl ? (
                  <div className="relative group w-full">
                    <img
                      src={editBannerPreview || selectedTemplate?.bannerImageUrl || ''}
                      alt="Banner preview"
                      className="max-h-[120px] w-full object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">No banner image</p>
                  </div>
                )}
                {bannerUploadMutation.isPending && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={editBannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleEditBannerChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => editBannerInputRef.current?.click()}
                  disabled={bannerUploadMutation.isPending || deleteBannerMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {editBannerPreview || selectedTemplate?.bannerImageUrl
                    ? 'Replace Banner'
                    : 'Upload Banner'}
                </Button>
                {(editBannerPreview || selectedTemplate?.bannerImageUrl) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (selectedTemplate) {
                        deleteBannerMutation.mutate(selectedTemplate.id);
                      }
                    }}
                    disabled={bannerUploadMutation.isPending || deleteBannerMutation.isPending}
                  >
                    {deleteBannerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                600 x 200 px &middot; 3:1 ratio &middot; Max 2MB
              </p>
            </div>
            <div className="space-y-2">
              <Label>Variables</Label>
              <Input
                value={editFormData.variables}
                onChange={(e) => setEditFormData({ ...editFormData, variables: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Comma-separated variable names</p>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-md">
              <Switch
                checked={editFormData.isActive}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, isActive: checked })
                }
              />
              <div>
                <Label>Template Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive templates will not be sent by the system
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedTemplate(null);
              }}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{selectedTemplate?.name}&quot;</strong>{' '}
              (<code className="text-xs">{selectedTemplate?.templateKey}</code>)? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Subject: <strong>{previewSubject}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <iframe
              srcDoc={previewHtml}
              title="Email Preview"
              className="w-full border-0"
              style={{ minHeight: '600px' }}
              onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentDocument?.body) {
                  iframe.style.height = iframe.contentDocument.body.scrollHeight + 40 + 'px';
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesListPage;
