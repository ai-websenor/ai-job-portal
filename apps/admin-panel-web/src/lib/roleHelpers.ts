import { User } from '@/stores/authStore';

/**
 * Check if user has super admin role
 */
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.role === 'super_admin';
};

/**
 * Check if user has admin role (not super admin)
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Check if user has admin or super admin role
 */
export const isAdminOrSuperAdmin = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'super_admin';
};

/**
 * Check if user is company-scoped (has a company assignment)
 */
export const isCompanyScoped = (user: User | null): boolean => {
  return Boolean(user?.companyId);
};

/**
 * Get display name for user's role
 */
export const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    employer: 'Employer',
    candidate: 'Candidate',
  };
  return roleNames[role] || role;
};

/**
 * Get company scope information for display
 */
export const getCompanyScopeInfo = (user: User | null): string => {
  if (!user) return '';

  if (isSuperAdmin(user)) {
    return 'All Companies';
  }

  if (isCompanyScoped(user)) {
    return user.companyName || 'Company Assigned';
  }

  return 'No Company';
};
