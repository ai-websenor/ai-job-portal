/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import type { IAvatar, AvatarGender } from '@/types/index';

interface AvatarFormData {
  name: string;
  gender: AvatarGender;
  displayOrder?: number;
  isActive?: boolean;
}

interface AvatarApiResponse {
  data: IAvatar[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const AVATAR_GENDERS: AvatarGender[] = ['male', 'female', 'other'];

const initialFormData: AvatarFormData = {
  name: '',
  gender: 'other',
  displayOrder: 0,
  isActive: true,
};

export default function AvatarsListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteAvatarId, setDeleteAvatarId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<AvatarFormData>(initialFormData);
  const [editingAvatar, setEditingAvatar] = useState<IAvatar | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  // Fetch avatars list
  const { data: avatarsData, isLoading } = useQuery({
    queryKey: ['avatars', page, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
      });
      const response = await http.get(`${endpoints.avatars.list}?${params}`);
      return response as unknown as AvatarApiResponse;
    },
  });

  const avatars: IAvatar[] = avatarsData?.data || [];
  const pagination = avatarsData?.pagination;
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || page;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AvatarFormData) => {
      if (!avatarFile) {
        throw new Error('Avatar image is required');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('file', avatarFile);
      formDataToSend.append('name', data.name);
      formDataToSend.append('gender', data.gender);

      return await http.post(endpoints.avatars.create, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar created successfully');
      setIsCreateOpen(false);
      setFormData(initialFormData);
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create avatar');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AvatarFormData> }) => {
      return await http.patch(endpoints.avatars.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar updated successfully');
      setIsEditOpen(false);
      setEditingAvatar(null);
      setFormData(initialFormData);
      setEditAvatarFile(null);
      setEditAvatarPreview(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update avatar');
    },
  });

  // Update image mutation
  const updateImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return await http.patch(endpoints.avatars.updateImage(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar image updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update avatar image');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.avatars.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar deleted successfully');
      setDeleteAvatarId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete avatar');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await http.patch(endpoints.avatars.updateStatus(id), { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update avatar status');
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, displayOrder }: { id: string; displayOrder: number }) => {
      return await http.patch(endpoints.avatars.updateOrder(id), { displayOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatars'] });
      toast.success('Avatar order updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update avatar order');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }

      setEditAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Avatar name is required');
      return;
    }
    if (!avatarFile) {
      toast.error('Avatar image is required');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (avatar: IAvatar) => {
    setEditingAvatar(avatar);
    setFormData({
      name: avatar.name,
      gender: avatar.gender,
      displayOrder: avatar.displayOrder,
      isActive: avatar.isActive,
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAvatar) return;
    if (!formData.name.trim()) {
      toast.error('Avatar name is required');
      return;
    }

    // Update metadata first
    await updateMutation.mutateAsync({ id: editingAvatar.id, data: formData });

    // If a new image was selected, update it separately
    if (editAvatarFile) {
      await updateImageMutation.mutateAsync({ id: editingAvatar.id, file: editAvatarFile });
    }

    // Close dialog after all updates
    setIsEditOpen(false);
    setEditingAvatar(null);
    setFormData(initialFormData);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
  };

  const handleDelete = (id: string) => {
    setDeleteAvatarId(id);
  };

  const confirmDelete = () => {
    if (deleteAvatarId) {
      deleteMutation.mutate(deleteAvatarId);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleMoveOrder = (avatar: IAvatar, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? avatar.displayOrder - 1 : avatar.displayOrder + 1;
    updateOrderMutation.mutate({ id: avatar.id, displayOrder: Math.max(0, newOrder) });
  };

  const resetCreateForm = () => {
    setFormData(initialFormData);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const resetEditForm = () => {
    setFormData(initialFormData);
    setEditingAvatar(null);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avatar Management</h1>
          <p className="text-muted-foreground">Manage profile avatars for users</p>
        </div>
        <Button
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload Avatar
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Avatars</CardTitle>
          <CardDescription>Total avatars: {total}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search avatars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : avatars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No avatars found
                    </TableCell>
                  </TableRow>
                ) : (
                  avatars.map((avatar) => (
                    <TableRow key={avatar.id}>
                      <TableCell>
                        {avatar.imageUrl ? (
                          <img
                            src={avatar.imageUrl}
                            alt={avatar.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{avatar.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {avatar.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="min-w-[2rem]">{avatar.displayOrder}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMoveOrder(avatar, 'up')}
                              disabled={updateOrderMutation.isPending}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMoveOrder(avatar, 'down')}
                              disabled={updateOrderMutation.isPending}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={avatar.isActive}
                          onCheckedChange={() => handleToggleStatus(avatar.id, avatar.isActive)}
                          disabled={toggleStatusMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>{new Date(avatar.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(avatar)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(avatar.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Avatar</DialogTitle>
            <DialogDescription>
              Upload a profile avatar. Supported formats: JPEG, PNG, WebP (max 2MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="avatar-name">Avatar Name</Label>
              <Input
                id="avatar-name"
                placeholder="e.g., Professional Male Avatar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar-gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: AvatarGender) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger id="avatar-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVATAR_GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender} className="capitalize">
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar-file">Avatar Image</Label>
              <Input
                id="avatar-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
              {avatarPreview && (
                <div className="mt-2">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="h-32 w-32 rounded-full object-cover border"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Uploading...' : 'Upload Avatar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Avatar</DialogTitle>
            <DialogDescription>Update avatar details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current or Preview Image */}
            <div className="flex justify-center">
              <img
                src={editAvatarPreview || editingAvatar?.imageUrl || ''}
                alt={editingAvatar?.name || 'Avatar preview'}
                className="h-32 w-32 rounded-full object-cover border"
              />
            </div>

            {/* Upload New Image */}
            <div className="space-y-2">
              <Label htmlFor="edit-avatar-file">Update Image (Optional)</Label>
              <Input
                id="edit-avatar-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleEditFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Upload a new image to replace the current one. Leave empty to keep existing image.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-avatar-name">Avatar Name</Label>
              <Input
                id="edit-avatar-name"
                placeholder="e.g., Professional Male Avatar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-avatar-gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: AvatarGender) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger id="edit-avatar-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVATAR_GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender} className="capitalize">
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-avatar-order">Display Order</Label>
              <Input
                id="edit-avatar-order"
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending || updateImageMutation.isPending}
              >
                {updateMutation.isPending || updateImageMutation.isPending
                  ? 'Updating...'
                  : 'Update Avatar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAvatarId} onOpenChange={() => setDeleteAvatarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the avatar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
