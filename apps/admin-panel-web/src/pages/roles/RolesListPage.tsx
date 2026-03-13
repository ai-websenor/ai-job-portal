/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

export default function RolesListPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[],
  });

  // Fetch all roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await http.get(endpoints.role.list);
      return response.data || response;
    },
  });

  // Fetch all permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await http.get(endpoints.permission.list);
      return response.data || response;
    },
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await http.post(endpoints.role.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      setFormData({ name: '', description: '', permissionIds: [] });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create role');
    },
  });

  // Update role mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await http.put(endpoints.role.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      setEditingRole(null);
      setFormData({ name: '', description: '', permissionIds: [] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await http.delete(endpoints.role.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
      setDeletingRole(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete role');
    },
  });

  const handleCreateRole = () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions.map((p) => p.id),
    });
  };

  const handleUpdateRole = () => {
    if (!editingRole || !formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }
    updateMutation.mutate({ id: editingRole.id, data: formData });
  };

  const handleDeleteRole = () => {
    if (deletingRole) {
      deleteMutation.mutate(deletingRole.id);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((p) => p !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Create and manage user roles and permissions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Define role details and assign permissions</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., CONTENT_MODERATOR"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this role"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Permissions</Label>
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <div key={resource} className="space-y-2">
                      <h4 className="text-sm font-medium capitalize">{resource}</h4>
                      <div className="grid grid-cols-2 gap-2 pl-4">
                        {perms.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`create-${permission.id}`}
                              checked={formData.permissionIds.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={`create-${permission.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {permission.action}
                              </label>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {role.name}
                  </CardTitle>
                  <CardDescription>{role.description || 'No description'}</CardDescription>
                </div>
                <Badge variant={role.isActive ? 'default' : 'secondary'}>
                  {role.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Permissions ({role.permissions.length})</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 5).map((permission) => (
                    <Badge key={permission.id} variant="outline" className="text-xs">
                      {permission.name}
                    </Badge>
                  ))}
                  {role.permissions.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditRole(role)}
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Edit Role</DialogTitle>
                      <DialogDescription>Modify role details and permissions</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Role Name *</Label>
                          <Input
                            id="edit-name"
                            placeholder="e.g., CONTENT_MODERATOR"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            placeholder="Brief description of this role"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            rows={3}
                          />
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <Label>Permissions</Label>
                          {Object.entries(groupedPermissions).map(([resource, perms]) => (
                            <div key={resource} className="space-y-2">
                              <h4 className="text-sm font-medium capitalize">{resource}</h4>
                              <div className="grid grid-cols-2 gap-2 pl-4">
                                {perms.map((permission) => (
                                  <div key={permission.id} className="flex items-start space-x-2">
                                    <Checkbox
                                      id={`edit-${permission.id}`}
                                      checked={formData.permissionIds.includes(permission.id)}
                                      onCheckedChange={() => togglePermission(permission.id)}
                                    />
                                    <div className="grid gap-0.5 leading-none">
                                      <label
                                        htmlFor={`edit-${permission.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {permission.action}
                                      </label>
                                      {permission.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {permission.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingRole(null);
                          setFormData({ name: '', description: '', permissionIds: [] });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateRole} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Updating...' : 'Update Role'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingRole(role)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{deletingRole?.name}"? This action cannot be
              undone and will remove all user assignments for this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
