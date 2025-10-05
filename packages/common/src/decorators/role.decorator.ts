import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../constants/enums';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator - Restrict access to specific user roles
 * @param roles - Array of allowed roles
 * @example @Roles(UserRole.ADMIN, UserRole.EMPLOYER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
