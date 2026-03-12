import { User } from '@/stores/authStore';

/**
 * Check if user has a specific permission
 */
export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (user: User | null, permissions: string[]): boolean => {
  if (!user || !user.permissions) return false;
  return permissions.some((permission) => user.permissions?.includes(permission));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (user: User | null, permissions: string[]): boolean => {
  if (!user || !user.permissions) return false;
  return permissions.every((permission) => user.permissions?.includes(permission));
};

/**
 * Role-based access control helpers
 */
export const canManageCompanies = (user: User | null): boolean => {
  return user?.role === 'super_admin' && hasPermission(user, 'companies:write');
};

export const canManageAdmins = (user: User | null): boolean => {
  return user?.role === 'super_admin' && hasPermission(user, 'users:write');
};

export const canManageEmployers = (user: User | null): boolean => {
  return (
    (user?.role === 'admin' || user?.role === 'super_admin') &&
    hasPermission(user, 'employers:write')
  );
};

export const canManageJobs = (user: User | null): boolean => {
  return hasPermission(user, 'jobs:write');
};

export const canDeleteUsers = (user: User | null): boolean => {
  return user?.role === 'super_admin' && hasPermission(user, 'users:delete');
};

export const canModerateContent = (user: User | null): boolean => {
  return hasPermission(user, 'moderation:write');
};

export const canViewAnalytics = (user: User | null): boolean => {
  return hasPermission(user, 'analytics:read');
};

export const canManageResumeTemplates = (user: User | null): boolean => {
  return user?.role === 'super_admin' && hasPermission(user, 'resume-templates:write');
};

/**
 * Get allowed actions based on role
 * - Super Admin: Create Companies and Admins
 * - Admin: Create Employers only
 * - Employer: Create Jobs only
 */
export const getAllowedActions = (user: User | null) => {
  if (!user)
    return {
      canCreateCompany: false,
      canCreateAdmin: false,
      canCreateEmployer: false,
      canCreateJob: false,
    };

  return {
    canCreateCompany: user.role === 'super_admin',
    canCreateAdmin: user.role === 'super_admin',
    canCreateEmployer: user.role === 'admin' || user.role === 'super_admin',
    canCreateJob: user.role === 'employer' || user.role === 'admin' || user.role === 'super_admin',
  };
};
