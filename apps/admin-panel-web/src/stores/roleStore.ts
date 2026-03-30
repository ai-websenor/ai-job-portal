import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// TODO: Import http and endpoints when ready to integrate API
// import http from '@/api/http';
// import endpoints from '@/api/endpoints';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isCustom: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  invitedAt?: string;
}

interface RoleState {
  roles: Role[];
  members: Member[];
  permissions: Permission[];
  addRole: (role: Omit<Role, 'id'>) => void;
  updateRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  inviteMember: (email: string, roleId: string) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  removeMember: (id: string) => void;
}

const defaultPermissions: Permission[] = [
  { id: 'view_analytics', name: 'View Analytics', description: 'Access to dashboard analytics' },
  { id: 'manage_users', name: 'Manage Users', description: 'Block/unblock users, reset passwords' },
  { id: 'manage_posts', name: 'Manage Posts', description: 'Review and moderate posts' },
  { id: 'manage_roles', name: 'Manage Roles', description: 'Create and edit user roles' },
  { id: 'invite_members', name: 'Invite Members', description: 'Invite new admin members' },
];

const defaultRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to all features',
    permissions: defaultPermissions.map((p) => p.id),
    isCustom: false,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Can manage users and posts',
    permissions: ['view_analytics', 'manage_users', 'manage_posts'],
    isCustom: false,
  },
];

export const useRoleStore = create<RoleState>()(
  persist(
    (set, get) => ({
      roles: defaultRoles,
      members: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'Super Admin',
          status: 'active',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'Moderator',
          status: 'active',
        },
      ],
      permissions: defaultPermissions,
      addRole: async (roleData) => {
        // TODO: Replace with API call
        // const response = await http.post(endpoints.role.create, roleData);
        // const newRole = response.data;

        // Mock implementation - REMOVE when API is integrated
        const newRole: Role = {
          ...roleData,
          id: Date.now().toString(),
        };
        set((state) => ({ roles: [...state.roles, newRole] }));
      },
      updateRole: (id, updates) => {
        set((state) => ({
          roles: state.roles.map((role) => (role.id === id ? { ...role, ...updates } : role)),
        }));
      },
      deleteRole: (id) => {
        set((state) => ({
          roles: state.roles.filter((role) => role.id !== id),
        }));
      },
      inviteMember: (email, roleId) => {
        const role = get().roles.find((r) => r.id === roleId);
        const newMember: Member = {
          id: Date.now().toString(),
          name: email.split('@')[0],
          email,
          role: role?.name || 'Viewer',
          status: 'pending',
          invitedAt: new Date().toISOString(),
        };
        set((state) => ({ members: [...state.members, newMember] }));
      },
      updateMember: (id, updates) => {
        set((state) => ({
          members: state.members.map((member) =>
            member.id === id ? { ...member, ...updates } : member,
          ),
        }));
      },
      removeMember: (id) => {
        set((state) => ({
          members: state.members.filter((member) => member.id !== id),
        }));
      },
    }),
    {
      name: 'role-storage',
      partialize: (state) => ({
        roles: state.roles,
        members: state.members,
        permissions: state.permissions,
      }),
    },
  ),
);
