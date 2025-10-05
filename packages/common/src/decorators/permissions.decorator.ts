import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions decorator - Restrict access to specific permissions
 * @param permissions - Array of required permissions
 * @example @RequirePermissions('job:create', 'job:update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const TEAM_ROLE_KEY = 'teamRole';

/**
 * Team Role decorator - Restrict access to specific team roles
 * @param roles - Array of allowed team roles
 * @example @RequireTeamRole('admin', 'recruiter')
 */
export const RequireTeamRole = (...roles: string[]) =>
  SetMetadata(TEAM_ROLE_KEY, roles);
