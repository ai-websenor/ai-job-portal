import { useAuthStore } from '@/stores/authStore';

/**
 * Hook for checking user permissions (RBAC)
 *
 * @example
 * ```tsx
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
 *
 * // Check single permission
 * if (hasPermission('CREATE_COMPANY')) {
 *   return <CreateCompanyButton />;
 * }
 *
 * // Check if user has at least one permission (OR logic)
 * if (hasAnyPermission(['CREATE_COMPANY', 'UPDATE_COMPANY'])) {
 *   return <ManageCompanySection />;
 * }
 *
 * // Check if user has all permissions (AND logic)
 * if (hasAllPermissions(['CREATE_COMPANY', 'DELETE_COMPANY'])) {
 *   return <FullCompanyManagement />;
 * }
 * ```
 */
export const usePermissions = () => {
  const permissions = useAuthStore((state) => state.permissions);

  /**
   * Check if user has a specific permission
   * @param permission - Permission code to check (e.g., 'CREATE_COMPANY')
   * @returns true if user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Check if user has at least one of the specified permissions (OR logic)
   * @param perms - Array of permission codes
   * @returns true if user has any of the permissions
   */
  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((perm) => permissions.includes(perm));
  };

  /**
   * Check if user has all of the specified permissions (AND logic)
   * @param perms - Array of permission codes
   * @returns true if user has all of the permissions
   */
  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((perm) => permissions.includes(perm));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
