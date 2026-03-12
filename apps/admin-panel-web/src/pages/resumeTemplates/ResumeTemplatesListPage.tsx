/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, FileText, Image } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
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
import { Checkbox } from '@/components/ui/checkbox';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import type { IResumeTemplate, TemplateLevel } from '@/types/index';

interface TemplateFormData {
  name: string;
  templateType?: string;
  templateLevel?: TemplateLevel;
  templateHtml: string;
  templateCss?: string;
  displayOrder?: number;
  isPremium?: boolean;
  isActive?: boolean;
}

interface TemplateApiResponse {
  data: IResumeTemplate[];
  pagination: {
    totalTemplates: number;
    pageCount: number;
    currentPage: number;
    limit: number;
  };
}

const TEMPLATE_LEVELS: TemplateLevel[] = ['fresher', 'mid', 'experienced'];

const initialFormData: TemplateFormData = {
  name: '',
  templateType: '',
  templateLevel: undefined,
  templateHtml: '',
  templateCss: '',
  displayOrder: 0,
  isPremium: false,
  isActive: true,
};

export default function ResumeTemplatesListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [editingTemplate, setEditingTemplate] = useState<IResumeTemplate | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Fetch templates list
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['resumeTemplates', page, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      });
      const response = await http.get(`${endpoints.resumeTemplates.list}?${params}`);
      return response as unknown as TemplateApiResponse;
    },
  });

  const templates: IResumeTemplate[] = templatesData?.data || [];
  const pagination = templatesData?.pagination;
  const total = pagination?.totalTemplates || 0;
  const totalPages = pagination?.pageCount || 1;
  const currentPage = pagination?.currentPage || page;

  // Upload thumbnail helper
  const uploadThumbnail = async (templateId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await http.post(endpoints.resumeTemplates.uploadThumbnail(templateId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response: any = await http.post(endpoints.resumeTemplates.create, data);
      const templateId = response?.data?.id || response?.id;
      if (thumbnailFile && templateId) {
        await uploadThumbnail(templateId, thumbnailFile);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumeTemplates'] });
      toast.success('Template created successfully');
      setIsCreateOpen(false);
      setFormData(initialFormData);
      setThumbnailFile(null);
      setThumbnailPreview(null);
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      const response = await http.put(endpoints.resumeTemplates.update(id), data);
      if (thumbnailFile) {
        await uploadThumbnail(id, thumbnailFile);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumeTemplates'] });
      toast.success('Template updated successfully');
      setIsEditOpen(false);
      setEditingTemplate(null);
      setFormData(initialFormData);
      setThumbnailFile(null);
      setThumbnailPreview(null);
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.resumeTemplates.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumeTemplates'] });
      toast.success('Template deleted successfully');
      setDeleteTemplateId(null);
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const handleEdit = (template: IResumeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      templateType: template.templateType || '',
      templateLevel: template.templateLevel,
      templateHtml: template.templateHtml,
      templateCss: template.templateCss || '',
      displayOrder: template.displayOrder,
      isPremium: template.isPremium,
      isActive: template.isActive,
    });
    setThumbnailPreview(template.thumbnailUrl || null);
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB');
      return;
    }

    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resume Templates</CardTitle>
              <CardDescription>Manage resume templates for the job board</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No templates found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={template.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.templateType || '-'}</TableCell>
                      <TableCell>
                        {template.templateLevel ? (
                          <Badge variant="outline">{template.templateLevel}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isPremium ? (
                          <Badge variant="secondary">Premium</Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{template.displayOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTemplateId(template.id)}
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
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {templates.length} of {total} templates
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update template details' : 'Add a new resume template'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="templateType">Template Type</Label>
              <Input
                id="templateType"
                value={formData.templateType}
                onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div>
              <Label htmlFor="templateLevel">Template Level</Label>
              <Select
                value={formData.templateLevel}
                onValueChange={(value: TemplateLevel) =>
                  setFormData({ ...formData, templateLevel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="templateHtml">Template HTML *</Label>
              <Textarea
                id="templateHtml"
                value={formData.templateHtml}
                onChange={(e) => setFormData({ ...formData, templateHtml: e.target.value })}
                rows={6}
                required
                placeholder="<div>{{personalInfo.firstName}} {{personalInfo.lastName}}</div>"
              />
            </div>

            <div>
              <Label htmlFor="templateCss">Template CSS</Label>
              <Textarea
                id="templateCss"
                value={formData.templateCss}
                onChange={(e) => setFormData({ ...formData, templateCss: e.target.value })}
                rows={4}
                placeholder=".resume { font-family: Arial; }"
              />
            </div>

            <div>
              <Label htmlFor="thumbnail">Thumbnail (JPEG/PNG/WebP, max 2MB)</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleThumbnailChange}
              />
              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt="Preview"
                  className="mt-2 h-32 w-32 rounded object-cover"
                />
              )}
            </div>

            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPremium"
                checked={formData.isPremium}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPremium: checked as boolean })
                }
              />
              <Label htmlFor="isPremium">Premium Template</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && deleteMutation.mutate(deleteTemplateId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
