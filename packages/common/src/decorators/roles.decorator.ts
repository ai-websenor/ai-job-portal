import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type UserRole = 'candidate' | 'employer' | 'admin' | 'team_member';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
