import { and, eq } from 'drizzle-orm';

/**
 * Checks if an employer has a specific company-level permission via RBAC chain.
 * Flow: employers.rbacRoleId -> role_permissions -> permissions
 *
 * Super employers always have all company-level permissions.
 *
 * @param db - Drizzle database instance
 * @param employerRbacRoleId - The employer's rbacRoleId (from employers table)
 * @param userRole - The user's role (e.g., 'employer', 'super_employer')
 * @param permissionName - The permission name to check (e.g., 'company-jobs:read')
 * @returns true if the employer has the permission
 */
export async function hasCompanyPermission(
  db: any,
  employerRbacRoleId: string | null,
  userRole: string,
  permissionName: string,
): Promise<boolean> {
  // Super employer always has all company-level permissions
  if (userRole === 'super_employer') return true;

  if (!employerRbacRoleId) return false;

  // Import schemas dynamically to avoid circular deps
  const { rolePermissions, permissions } = await import('@ai-job-portal/database');

  // Check RBAC chain: roleId -> rolePermissions -> permissions
  const result = await db
    .select({ id: permissions.id })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(rolePermissions.roleId, employerRbacRoleId),
        eq(permissions.name, permissionName),
        eq(permissions.isActive, true),
      ),
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Gets the employer record with companyId and rbacRoleId for company permission checks.
 * Also resolves the user role from the X-User-Role header.
 */
export async function getEmployerForCompanyAccess(
  db: any,
  userId: string,
): Promise<{
  employerId: string;
  companyId: string | null;
  rbacRoleId: string | null;
} | null> {
  const { employers } = await import('@ai-job-portal/database');

  const employer = await db.query.employers.findFirst({
    where: eq(employers.userId, userId),
    columns: {
      id: true,
      companyId: true,
      rbacRoleId: true,
    },
  });

  if (!employer) return null;

  return {
    employerId: employer.id,
    companyId: employer.companyId,
    rbacRoleId: employer.rbacRoleId,
  };
}
