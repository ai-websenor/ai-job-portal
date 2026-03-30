import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/forms/FormInput";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormCheckbox } from "@/components/forms/FormCheckbox";
import { PageHeader } from "@/components/lib/PageHeader";
import { useRoleStore } from "@/stores/roleStore";
import { toast } from "sonner";
import { useEffect } from "react";

const roleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  view_analytics: z.boolean().default(false),
  manage_users: z.boolean().default(false),
  manage_posts: z.boolean().default(false),
  manage_roles: z.boolean().default(false),
  invite_members: z.boolean().default(false),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export default function RolesFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { roles, addRole, updateRole, permissions } = useRoleStore();
  const isEditing = !!id;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      view_analytics: false,
      manage_users: false,
      manage_posts: false,
      manage_roles: false,
      invite_members: false,
    },
  });

  useEffect(() => {
    if (isEditing && id) {
      const role = roles.find((r) => r.id === id);
      if (role) {
        form.reset({
          name: role.name,
          description: role.description,
          view_analytics: role.permissions.includes("view_analytics"),
          manage_users: role.permissions.includes("manage_users"),
          manage_posts: role.permissions.includes("manage_posts"),
          manage_roles: role.permissions.includes("manage_roles"),
          invite_members: role.permissions.includes("invite_members"),
        });
      }
    }
  }, [id, isEditing, roles, form]);

  const onSubmit = (data: RoleFormValues) => {
    const selectedPermissions = permissions
      .map((p) => p.id)
      .filter((permId) => data[permId as keyof RoleFormValues] === true);

    const roleData = {
      name: data.name,
      description: data.description,
      permissions: selectedPermissions,
      isCustom: true,
    };

    if (isEditing && id) {
      updateRole(id, roleData);
      toast.success(`${data.name} role updated successfully`);
    } else {
      addRole(roleData);
      toast.success(`${data.name} role created successfully`);
    }

    navigate("/roles/list");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? "Edit Role" : "Create Role"}
        description={
          isEditing
            ? "Update role permissions and details"
            : "Create a new role with specific permissions"
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormInput
                control={form.control}
                name="name"
                label="Role Name"
                placeholder="Enter role name"
              />

              <FormTextarea
                control={form.control}
                name="description"
                label="Description"
                placeholder="Describe this role"
                rows={3}
              />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Permissions</h3>
                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <FormCheckbox
                      key={permission.id}
                      control={form.control}
                      name={permission.id as any}
                      label={permission.name}
                      description={permission.description}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit">
                  {isEditing ? "Update Role" : "Create Role"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/roles/list")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
